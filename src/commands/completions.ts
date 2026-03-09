import { getAppNames, getStackNames, getApp, getAllContainerNames } from "@/lib/apps.js";

const SUBCOMMANDS = [
  "setup", "backup", "restore", "recover", "start", "stop", "restart",
  "install", "reinstall", "uninstall", "status", "health", "doctor",
  "update", "log", "graph", "self-update", "config", "version", "completions", "docs",
];

const APP_COMMANDS = [
  "start", "stop", "restart", "reinstall", "uninstall",
  "update", "log",
];

const BACKUP_SUBCOMMANDS = ["list", "delete", "verify"];

/** Build a map of app name → service names for multi-container apps */
function getLogServiceMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const name of getAppNames()) {
    const app = getApp(name);
    if (!app?.additionalContainers) continue;
    const containers = getAllContainerNames(app);
    const prefix = `${name}_`;
    const services = containers.map((c) =>
      c.startsWith(prefix) ? c.slice(prefix.length).replace(/_/g, "-") : c,
    );
    map.set(name, services);
  }
  return map;
}

function generateBash(): string {
  const apps = getAppNames().join(" ");
  const stacks = getStackNames().join(" ");
  const cmds = SUBCOMMANDS.join(" ");
  const appCmds = APP_COMMANDS.join("|");
  const backupSubs = BACKUP_SUBCOMMANDS.join(" ");
  const installTargets = `docker backup https firewall ${stacks} ${apps}`;

  const logServiceMap = getLogServiceMap();
  const logServiceCases = [...logServiceMap.entries()]
    .map(([app, services]) => `        ${app}) COMPREPLY=( $(compgen -W "${services.join(" ")}" -- "$cur") ) ;;`)
    .join("\n");

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
    install)
      COMPREPLY=( $(compgen -W "${installTargets}" -- "$cur") )
      ;;
    ${appCmds})
      if [[ "\${words[1]}" == "log" && $cword -eq 3 ]]; then
        case "\${words[2]}" in
${logServiceCases}
        esac
      else
        COMPREPLY=( $(compgen -W "${apps}" -- "$cur") )
      fi
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
    docs)
      COMPREPLY=( $(compgen -W "stop" -- "$cur") )
      ;;
  esac
}
complete -F _mithrandir mithrandir
`;
}

function generateZsh(): string {
  const apps = getAppNames().join(" ");
  const stacks = getStackNames().join(" ");
  const cmds = SUBCOMMANDS.join(" ");
  const backupSubs = BACKUP_SUBCOMMANDS.join(" ");
  const logServiceMap = getLogServiceMap();

  return `# mithrandir zsh completions
# Add to ~/.zshrc: eval "$(mithrandir completions zsh)"
_mithrandir() {
  local state

  _arguments -C \\
    '1:command:->command' \\
    '*:arg:->args'

  case $state in
    command)
      compadd -- ${cmds}
      ;;
    args)
      case \${words[2]} in
        install)
          compadd -- docker backup https firewall ${stacks} ${apps}
          ;;
        start|stop|restart|reinstall|uninstall|update)
          compadd -- ${apps}
          ;;
        log)
          if (( CURRENT == 3 )); then
            compadd -- ${apps}
          elif (( CURRENT == 4 )); then
            case \${words[3]} in
${[...logServiceMap.entries()].map(([app, services]) => `              ${app}) compadd -- ${services.join(" ")} ;;`).join("\n")}
            esac
          fi
          ;;
        backup)
          if (( CURRENT == 3 )); then
            compadd -- ${backupSubs} ${apps}
          elif [[ \${words[3]} == "list" || \${words[3]} == "delete" ]]; then
            compadd -- local remote
          elif [[ \${words[3]} == "verify" ]]; then
            compadd -- --remote --extract
          fi
          ;;
        restore)
          if (( CURRENT == 3 )); then
            compadd -- full ${apps}
          fi
          ;;
        completions)
          compadd -- bash zsh fish
          ;;
        docs)
          compadd -- stop
          ;;
      esac
      ;;
  esac
}
compdef _mithrandir mithrandir
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

  const stacks = getStackNames();

  lines.push("", "# Install targets (docker, backup, https, stacks, and app names)");
  lines.push(`complete -c mithrandir -n '__fish_seen_subcommand_from install' -a 'docker'`);
  lines.push(`complete -c mithrandir -n '__fish_seen_subcommand_from install' -a 'backup'`);
  lines.push(`complete -c mithrandir -n '__fish_seen_subcommand_from install' -a 'https'`);
  lines.push(`complete -c mithrandir -n '__fish_seen_subcommand_from install' -a 'firewall'`);
  for (const stack of stacks) {
    lines.push(
      `complete -c mithrandir -n '__fish_seen_subcommand_from install' -a '${stack}'`,
    );
  }
  for (const app of apps) {
    lines.push(
      `complete -c mithrandir -n '__fish_seen_subcommand_from install' -a '${app}'`,
    );
  }

  lines.push("", "# App names for app commands");
  const appCmds = ["start", "stop", "restart", "reinstall", "uninstall", "update", "log"];
  for (const cmd of appCmds) {
    for (const app of apps) {
      lines.push(
        `complete -c mithrandir -n '__fish_seen_subcommand_from ${cmd}' -a '${app}'`,
      );
    }
  }

  const logServiceMap = getLogServiceMap();
  lines.push("", "# Log service names for multi-container apps");
  for (const [app, services] of logServiceMap) {
    lines.push(
      `complete -c mithrandir -n '__fish_seen_subcommand_from log; and __fish_seen_subcommand_from ${app}' -a '${services.join(" ")}'`,
    );
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

  lines.push("", "# Docs subcommands");
  lines.push(`complete -c mithrandir -n '__fish_seen_subcommand_from docs' -a 'stop'`);

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
