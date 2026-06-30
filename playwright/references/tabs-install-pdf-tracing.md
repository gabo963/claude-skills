# Extras

> Command reference. See [SKILL.md](../SKILL.md) for overview and shell CLI usage.

## Tab Management

### tabs

List, create, close, or select a browser tab.

| Subcommand        | Description                                          |
|-------------------|------------------------------------------------------|
| `tabs list`       | List all tabs with index and URL                     |
| `tabs new [url]`  | Create a new tab, optionally navigating to a URL     |
| `tabs close [i]`  | Close tab by index (omit to close current tab)       |
| `tabs select <i>` | Switch to tab by index                               |

## PDF Generation

### pdf

Save the current page as a PDF.

| Parameter  | Type   | Required | Description                                 |
|------------|--------|----------|---------------------------------------------|
| `filename` | string | No       | File name (default: `page-{timestamp}.pdf`) |
