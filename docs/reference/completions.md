# completions

Generate shell completion scripts.

## Usage

```sh
mithrandir completions <shell>
```

## Arguments

| Argument | Description |
| --- | --- |
| `shell` | **Required.** Shell type: `bash`, `zsh`, or `fish` |

## Examples

```sh
# Add to your shell profile for persistent completions

# Bash
mithrandir completions bash >> ~/.bashrc

# Zsh
mithrandir completions zsh >> ~/.zshrc

# Fish
mithrandir completions fish > ~/.config/fish/completions/mithrandir.fish
```

## Notes

- Does not require root privileges
- Completions include all commands, app names, backup subcommands, and flags
