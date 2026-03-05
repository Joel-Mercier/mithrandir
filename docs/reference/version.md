# version

Show the CLI version and git commit hash.

## Usage

```sh
mithrandir version
```

## Output

```
mithrandir v1.0.0 (abc1234)
```

## Notes

- Does not require root privileges
- Reads version from `package.json` and commit hash from `git rev-parse --short HEAD`
