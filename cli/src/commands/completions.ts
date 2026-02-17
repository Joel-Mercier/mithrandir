import { getAppNames } from "../lib/apps.js";

const SUBCOMMANDS = [
  "setup", "backup", "restore", "start", "stop", "restart",
  "install", "reinstall", "uninstall", "status", "health",
  "update", "log", "self-update", "config", "version", "completions",
];

const APP_COMMANDS = [
  "start", "stop", "restart", "install", "reinstall", "uninstall",
  "update", "log",
];

const BACKUP_SUBCOMMANDS = ["list", "delete", "verify"];

function generateBash(): string {
  const apps = getAppNames().join(" ");
  const cmds = SUBCOMMANDS.join(" ");
  const appCmds = APP_COMMANDS.join("|");
  const backupSubs = BACKUP_SUBCOMMANDS.join(" ");

  return `# mithrandir bash completions
# Add to ~/.bashrc: eval "$(mithrandir completions bash)"
_mithrandir() {
  local cur prev words cword
  _init_completion || return

  if [[ $cword -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "${cmds}" -- "$cur") )
    return
  fi

  case "\${words[1]}" in
    ${appCmds})
      COMPREPLY=( $(compgen -W "${apps}" -- "$cur") )
      ;;
    backup)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=( $(compgen -W "${backupSubs} ${apps}" -- "$cur") )
      elif [[ "\${words[2]}" == "list" ]]; then
        COMPREPLY=( $(compgen -W "local remote" -- "$cur") )
      elif [[ "\${words[2]}" == "delete" ]]; then
        COMPREPLY=( $(compgen -W "local remote" -- "$cur") )
      elif [[ "\${words[2]}" == "verify" ]]; then
        COMPREPLY=( $(compgen -W "--remote --extract" -- "$cur") )
      fi
      ;;
    restore)
      if [[ $cword -eq 2 ]]; then
        COMPREPLY=( $(compgen -W "full ${apps}" -- "$cur") )
      fi
      ;;
    completions)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- "$cur") )
      ;;
  esac
}
complete -F _mithrandir mithrandir
`;
}

function generateZsh(): string {
  const apps = getAppNames().join(" ");
  const cmds = SUBCOMMANDS.join(" ");
  const backupSubs = BACKUP_SUBCOMMANDS.join(" ");

  return `#compdef mithrandir
# mithrandir zsh completions
# Add to ~/.zshrc: eval "$(mithrandir completions zsh)"
_mithrandir() {
  local -a commands apps backup_subs
  commands=(${cmds})
  apps=(${apps})
  backup_subs=(${backupSubs})

  _arguments -C \\
    '1:command:->command' \\
    '*:arg:->args'

  case $state in
    command)
      _describe 'command' commands
      ;;
    args)
      case \${words[2]} in
        start|stop|restart|install|reinstall|uninstall|update|log)
          _describe 'app' apps
          ;;
        backup)
          if (( CURRENT == 3 )); then
            local -a backup_opts
            backup_opts=($backup_subs \${apps[@]})
            _describe 'backup subcommand or app' backup_opts
          elif [[ \${words[3]} == "list" || \${words[3]} == "delete" ]]; then
            _describe 'location' '(local remote)'
          fi
          ;;
        restore)
          if (( CURRENT == 3 )); then
            local -a restore_opts
            restore_opts=(full \${apps[@]})
            _describe 'target' restore_opts
          fi
          ;;
        completions)
          _describe 'shell' '(bash zsh fish)'
          ;;
      esac
      ;;
  esac
}
_mithrandir
`;
}

function generateFish(): string {
  const apps = getAppNames();
  const lines: string[] = [
    "# mithrandir fish completions",
    '# Add to fish config: mithrandir completions fish | source',
    "",
    "# Disable file completions",
    "complete -c mithrandir -f",
    "",
    "# Subcommands",
  ];

  for (const cmd of SUBCOMMANDS) {
    lines.push(
      `complete -c mithrandir -n '__fish_use_subcommand' -a '${cmd}'`,
    );
  }

  lines.push("", "# App names for app commands");
  const appCmds = ["start", "stop", "restart", "install", "reinstall", "uninstall", "update", "log"];
  for (const cmd of appCmds) {
    for (const app of apps) {
      lines.push(
        `complete -c mithrandir -n '__fish_seen_subcommand_from ${cmd}' -a '${app}'`,
      );
    }
  }

  lines.push("", "# Backup subcommands");
  for (const sub of BACKUP_SUBCOMMANDS) {
    lines.push(
      `complete -c mithrandir -n '__fish_seen_subcommand_from backup' -a '${sub}'`,
    );
  }
  for (const app of apps) {
    lines.push(
      `complete -c mithrandir -n '__fish_seen_subcommand_from backup' -a '${app}'`,
    );
  }

  lines.push("", "# Restore targets");
  lines.push(`complete -c mithrandir -n '__fish_seen_subcommand_from restore' -a 'full'`);
  for (const app of apps) {
    lines.push(
      `complete -c mithrandir -n '__fish_seen_subcommand_from restore' -a '${app}'`,
    );
  }

  lines.push("", "# Completions shell argument");
  lines.push(`complete -c mithrandir -n '__fish_seen_subcommand_from completions' -a 'bash zsh fish'`);

  lines.push("", "# Flags");
  lines.push(`complete -c mithrandir -l yes -s y -d 'Skip confirmation prompts'`);
  lines.push(`complete -c mithrandir -l follow -s f -d 'Follow log output'`);
  lines.push(`complete -c mithrandir -l tail -s n -d 'Number of lines to show'`);
  lines.push(`complete -c mithrandir -l since -d 'Show logs since timestamp'`);
  lines.push(`complete -c mithrandir -l remote -d 'Verify remote backups'`);
  lines.push(`complete -c mithrandir -l extract -d 'Test extraction during verify'`);
  lines.push("");

  return lines.join("\n");
}

export function runCompletions(args: string[]): void {
  const shell = args[0];

  if (!shell || !["bash", "zsh", "fish"].includes(shell)) {
    console.error(
      "Usage: mithrandir completions <bash|zsh|fish>\n\nExamples:\n  eval \"$(mithrandir completions bash)\"    # bash\n  eval \"$(mithrandir completions zsh)\"     # zsh\n  mithrandir completions fish | source     # fish",
    );
    process.exit(1);
  }

  switch (shell) {
    case "bash":
      process.stdout.write(generateBash());
      break;
    case "zsh":
      process.stdout.write(generateZsh());
      break;
    case "fish":
      process.stdout.write(generateFish());
      break;
  }
}
