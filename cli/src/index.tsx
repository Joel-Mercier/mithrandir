#!/usr/bin/env bun
import meow from "meow";
import { render } from "ink";
import { runBackup } from "./commands/backup.js";
import { runRestore } from "./commands/restore.js";
import { SetupCommand } from "./commands/setup.js";
import { UninstallCommand } from "./commands/uninstall.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";

const cli = meow(
  `
  Usage
    $ homelab <command> [options]

  Commands
    setup                     Interactive setup wizard
    backup [app]              Backup all or a specific app
    restore <app|full> [date] Restore app(s) from backup
    uninstall <app>           Uninstall an app

  Options
    --yes, -y                 Skip confirmation prompts
    --help                    Show this help
    --version                 Show version

  Examples
    $ homelab setup
    $ homelab setup --yes
    $ homelab backup
    $ homelab backup radarr
    $ homelab restore jellyfin
    $ homelab restore full 2025-01-01
    $ homelab restore full latest --yes
    $ homelab uninstall radarr
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
    runBackup(cli.flags, cli.input[1]);
    break;

  case "restore":
    runRestore(cli.input.slice(1), cli.flags);
    break;

  case "uninstall":
    render(
      <ErrorBoundary>
        <UninstallCommand app={cli.input[1]} flags={cli.flags} />
      </ErrorBoundary>,
    );
    break;

  default:
    cli.showHelp();
}
