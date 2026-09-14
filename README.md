# skills

Agent skills and pi config for Claude Code, Codex, and pi.

This repo is the source of truth. The installer symlinks files out of this
checkout, so edits here show up wherever they are installed.

## Layout

```
install
skills/
  <skill-name>/
    SKILL.md
    (optional supporting files)
configs/
  pi/
    agent/
      settings.json
      extensions/
      themes/
```

## Installing

```sh
./install all global                  # user-wide skills plus pi config
./install my-network global           # one skill, user-wide
./install my-network ~/Dev/some-app   # one skill for one project
./install pi global                   # pi config only
```

Skill installs make these links:

```
<base>/.agents/skills/<skill>  ->  <this repo>/skills/<skill>
<base>/.claude/skills/<skill>  ->  ../../.agents/skills/<skill>
```

where `<base>` is `~` for `global` or the project dir otherwise.
`.agents/skills` is the shared skill dir. `.claude/skills` points at it for
Claude Code.

pi config installs make links under `~/.pi/agent/` for files in
`configs/pi/agent/`, including `settings.json`, `extensions/*`, and `themes/*`.
State files such as auth, model cache, and sessions stay outside the repo.

Re-running is a no-op when links are already right. The installer adopts a
regular file, or an older link, when its content matches the repo copy.
Anything else already at a destination stops the script rather than being
overwritten.
