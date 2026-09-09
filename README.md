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

Symlink or copy a skill directory into `~/.claude/skills/` for user-wide use,
or into a project's `.claude/skills/` for project-scoped use.
