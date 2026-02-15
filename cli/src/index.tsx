#!/usr/bin/env bun
import meow from "meow";
import { render } from "ink";
import { runBackup, runBackupDelete } from "./commands/backup.js";
import { runRestore } from "./commands/restore.js";
import { SetupCommand } from "./commands/setup.js";
import { runUninstall } from "./commands/uninstall.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";

const cli = meow(
  `
  Usage
    $ mithrandir <command> [options]

  Commands
    setup                              Interactive setup wizard
    backup [app]                       Backup all or a specific app
    backup delete <local|remote> [date] Delete local or remote backups
    restore <app|full> [date]          Restore app(s) from backup
    uninstall [app]                    Uninstall an app, or full system uninstall

  Options
    --yes, -y                 Skip confirmation prompts
    --help                    Show this help
    --version                 Show version

  Examples
    $ mithrandir setup
    $ mithrandir setup --yes
    $ mithrandir backup
    $ mithrandir backup radarr
    $ mithrandir backup delete local
    $ mithrandir backup delete remote 2025-01-01
    $ mithrandir restore jellyfin
    $ mithrandir restore full 2025-01-01
    $ mithrandir restore full latest --yes
    $ mithrandir uninstall radarr
    $ mithrandir uninstall
`,
  {
    importMeta: import.meta,
    flags: {
      yes: {
        type: "boolean",
        shortFlag: "y",
        default: false,
      },
    },
  },
);

const command = cli.input[0];

switch (command) {
  case "setup":
    render(
      <ErrorBoundary>
        <SetupCommand flags={cli.flags} />
      </ErrorBoundary>,
    );
    break;

  case "backup":
    if (cli.input[1] === "delete") {
      runBackupDelete(cli.input.slice(2), cli.flags);
    } else {
      runBackup(cli.flags, cli.input[1]);
    }
    break;

  case "restore":
    runRestore(cli.input.slice(1), cli.flags);
    break;

  case "uninstall":
    runUninstall(cli.input.slice(1), cli.flags);
    break;

  default:
    cli.showHelp();
}
