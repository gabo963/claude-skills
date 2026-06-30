# Interaction

> Command reference. See [SKILL.md](../SKILL.md) for overview and shell CLI usage.

## click

Perform click on a web page.

| Parameter     | Type    | Required | Description                                       |
|---------------|---------|----------|---------------------------------------------------|
| `element`     | string  | Yes      | Human-readable element description                |
| `ref`         | string  | Yes      | Exact target element reference from page snapshot |
| `doubleClick` | boolean | No       | Perform double click                              |
| `button`      | string  | No       | Button to click (default: left)                   |
| `modifiers`   | array   | No       | Modifier keys to press                            |

## type

Type text into editable element.

| Parameter | Type    | Required | Description                                       |
|-----------|---------|----------|---------------------------------------------------|
| `element` | string  | Yes      | Human-readable element description                |
| `ref`     | string  | Yes      | Exact target element reference from page snapshot |
| `text`    | string  | Yes      | Text to type                                      |
| `submit`  | boolean | No       | Press Enter after typing                          |
| `slowly`  | boolean | No       | Type one character at a time                      |

## hover

Hover over element on page.

| Parameter | Type   | Required | Description                                       |
|-----------|--------|----------|---------------------------------------------------|
| `element` | string | Yes      | Human-readable element description                |
| `ref`     | string | Yes      | Exact target element reference from page snapshot |

## drag

Perform drag and drop between two elements.

| Parameter      | Type   | Required | Description                                       |
|----------------|--------|----------|---------------------------------------------------|
| `startElement` | string | Yes      | Human-readable source element description         |
| `startRef`     | string | Yes      | Exact source element reference from page snapshot |
| `endElement`   | string | Yes      | Human-readable target element description         |
| `endRef`       | string | Yes      | Exact target element reference from page snapshot |

## press

Press a key on the keyboard.

| Parameter | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| `key`     | string | Yes      | Key name (e.g., `ArrowLeft`, `a`, `Enter`) |

## select

Select an option in a dropdown.

| Parameter | Type   | Required | Description                                       |
|-----------|--------|----------|---------------------------------------------------|
| `element` | string | Yes      | Human-readable element description                |
| `ref`     | string | Yes      | Exact target element reference from page snapshot |
| `values`  | array  | Yes      | Values to select (single or multiple)             |

## fill

Fill multiple form fields.

| Parameter | Type  | Required | Description       |
|-----------|-------|----------|-------------------|
| `fields`  | array | Yes      | Fields to fill in |
