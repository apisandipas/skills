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
./install my-network global             # -> ~/.claude/skills/my-network
./install my-network ~/Dev/some-project # -> ~/Dev/some-project/.claude/skills/my-network
```

Re-running is a no-op when the link is already correct. If something else is
already at the destination the script stops and says so rather than replacing
it.
