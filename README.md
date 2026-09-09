# skills

Agent skills for Claude Code.

Each skill lives in its own directory containing a `SKILL.md` with frontmatter
(`name`, `description`) followed by the instructions the agent should follow.

## Layout

```
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

Each install makes two links, so both Codex and Claude Code find the skill:

```
<base>/.agents/skills/<skill>  ->  <this repo>/<skill>
<base>/.claude/skills/<skill>  ->  ../../.agents/skills/<skill>
```

where `<base>` is `~` for `global` or the project directory otherwise.
`.agents/skills` is the shared location Codex reads; `.claude/skills` is what
Claude Code reads, so it gets a relative link over to `.agents`.

Re-running is a no-op when the links are already correct. A link that already
resolves to this repo's copy by a different route is replaced. Anything else
already at a destination stops the script rather than being overwritten.
