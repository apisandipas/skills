# skills

Agent skills for Claude Code, Codex, and pi.

Each skill lives in its own directory under `skills/` containing a `SKILL.md`
with frontmatter (`name`, `description`) followed by the instructions the agent
should follow.

## Layout

```
skills/
  install
  skills/
    <skill-name>/
      SKILL.md
      (optional supporting files)
```

## Installing

`./install` symlinks a skill out of this checkout, so edits here show up
everywhere the skill is installed.

```sh
./install my-network global             # user-wide
./install my-network ~/Dev/some-project # one project
```

Each install makes two links, so Codex, pi, and Claude Code all find the skill:

```
<base>/.agents/skills/<skill>  ->  <this repo>/skills/<skill>
<base>/.claude/skills/<skill>  ->  ../../.agents/skills/<skill>
```

where `<base>` is `~` for `global` or the project directory otherwise.
`.agents/skills` is the shared location Codex and pi both read; `.claude/skills` is what
Claude Code reads, so it gets a relative link over to `.agents`.

Re-running is a no-op when the links are already correct. A link that already
resolves to this repo's copy by a different route is replaced, as is a dangling
link. Anything else already at a destination stops the script rather than being
overwritten.
