# Coordinate-Based Interactions

> Command reference. See [SKILL.md](../SKILL.md) for overview and shell CLI usage.

## click-xy

Click left mouse button at a given position.

| Parameter | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| `x`       | number | Yes      | X coordinate |
| `y`       | number | Yes      | Y coordinate |

## move-xy

Move mouse to a given position.

| Parameter | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| `x`       | number | Yes      | X coordinate |
| `y`       | number | Yes      | Y coordinate |

## drag-xy

Drag left mouse button to a given position.

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| `startX`  | number | Yes      | Start X coordinate |
| `startY`  | number | Yes      | Start Y coordinate |
| `endX`    | number | Yes      | End X coordinate   |
| `endY`    | number | Yes      | End Y coordinate   |

## scroll

Scroll the page.

| Parameter   | Type   | Required | Description                                            |
|-------------|--------|----------|--------------------------------------------------------|
| `direction` | string | Yes      | Direction: `up`, `down`, `left`, `right`               |
| `amount`    | number | No       | Pixels to scroll (default: 300)                        |
