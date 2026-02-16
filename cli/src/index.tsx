#!/usr/bin/env bun
import meow from "meow";
import { render } from "ink";
import { runBackup, runBackupDelete, runBackupList, runBackupVerify } from "./commands/backup.js";
import { runRestore } from "./commands/restore.js";
import { SetupCommand } from "./commands/setup.js";
import { runUninstall } from "./commands/uninstall.js";
import { runStatus } from "./commands/status.js";
import { runHealth } from "./commands/health.js";
import { runUpdate } from "./commands/update.js";
import { runLog } from "./commands/log.js";
import { runStart } from "./commands/start.js";
import { runStop } from "./commands/stop.js";
import { runRestart } from "./commands/restart.js";
import { runReinstall } from "./commands/reinstall.js";
import { runSelfUpdate } from "./commands/self-update.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";

const cli = meow(
  `
  Usage
    $ mithrandir <command> [options]

  Commands
    setup                              Interactive setup wizard
    backup [app]                       Backup all or a specific app
    backup list [local|remote]          List local and/or remote backups
    backup delete <local|remote> [date] Delete local or remote backups
    backup verify [date]               Verify backup archive integrity
    restore <app|full> [date]          Restore app(s) from backup
    start <app>                        Start a stopped app container
    stop <app>                         Stop a running app container
    restart <app>                      Restart a running app container
    reinstall <app>                    Reinstall an app (stop, remove, recreate)
    uninstall [app]                    Uninstall an app, or full system uninstall
    status                             Show installed apps and system status
    health                             Check system health (Docker, disk, backups)
    update [app]                       Update all or a specific app's container
    log <app>                          View container logs
    self-update                        Update the CLI itself from git

  Options
    --yes, -y                 Skip confirmation prompts
    --follow, -f              Follow log output (log command)
    --tail, -n                Number of lines to show from end (log command)
    --since                   Show logs since timestamp or relative (log command)
    --remote                  Verify remote backups (backup verify)
    --extract                 Test extraction during verify (backup verify)
    --help                    Show this help
    --version                 Show version

  Examples
    $ mithrandir setup
    $ mithrandir setup --yes
    $ mithrandir backup
    $ mithrandir backup radarr
    $ mithrandir backup list
    $ mithrandir backup list local
    $ mithrandir backup delete local
    $ mithrandir backup delete remote 2025-01-01
    $ mithrandir backup verify
    $ mithrandir backup verify 2025-01-01 --remote --extract
    $ mithrandir restore jellyfin
    $ mithrandir restore full 2025-01-01
    $ mithrandir restore full latest --yes
    $ mithrandir uninstall radarr
    $ mithrandir uninstall
    $ mithrandir status
    $ mithrandir health
    $ mithrandir update
    $ mithrandir update radarr
    $ mithrandir start radarr
    $ mithrandir stop radarr
    $ mithrandir restart radarr
    $ mithrandir reinstall radarr
    $ mithrandir reinstall radarr --yes
    $ mithrandir log radarr --follow --tail 100
    $ mithrandir self-update
`,
  {
    importMeta: import.meta,
    flags: {
      yes: {
        type: "boolean",
        shortFlag: "y",
        default: false,
      },
      follow: {
        type: "boolean",
        shortFlag: "f",
        default: false,
      },
      tail: {
        type: "string",
        shortFlag: "n",
      },
      since: {
        type: "string",
      },
      remote: {
        type: "boolean",
        default: false,
      },
      extract: {
        type: "boolean",
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
    if (cli.input[1] === "list") {
      runBackupList(cli.input.slice(2));
    } else if (cli.input[1] === "delete") {
      runBackupDelete(cli.input.slice(2), cli.flags);
    } else if (cli.input[1] === "verify") {
      runBackupVerify(cli.input.slice(2), cli.flags);
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

  case "status":
    runStatus();
    break;

  case "health":
    runHealth();
    break;

  case "update":
    runUpdate(cli.input.slice(1), cli.flags);
    break;

  case "log":
    runLog(cli.input.slice(1), cli.flags);
    break;

  case "start":
    runStart(cli.input.slice(1));
    break;

  case "stop":
    runStop(cli.input.slice(1));
    break;

  case "restart":
    runRestart(cli.input.slice(1));
    break;

  case "reinstall":
    runReinstall(cli.input.slice(1), cli.flags);
    break;

  case "self-update":
    runSelfUpdate();
    break;

  default:
    cli.showHelp();
}
