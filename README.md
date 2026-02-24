# Colors Needed for a Map of Empires

[![Netlify Status](https://api.netlify.com/api/v1/badges/8fbd6a95-9c52-445e-a122-46652ed2efcb/deploy-status)](https://app.netlify.com/projects/damonzucconi-colors-needed/deploys)

## Meta

- **State**: production
- **Production**:
  - **URL**: https://colors-needed.work.damonzucconi.com
  - **URL**: https://damonzucconi-colors-needed.netlify.app (fallback mode: `blue`)
- **Host**: `https://app.netlify.com/projects/damonzucconi-colors-needed/overview`
- **Deploys**: pushes to your default branch auto-deploy to production. [Manually trigger a deploy](https://app.netlify.com/projects/damonzucconi-colors-needed/deploys)

## Parameters

| Param    | Description                         | Type     | Default |
| -------- | ----------------------------------- | -------- | ------- |
| `c`      | Compact encoded palette (shareable) | `string` | —       |
| `amount` | Number of colors to generate        | `number` | `4`     |

## URL State

Palettes are encoded as base-36 color indices joined by `.` and stored in the `c` query parameter. Swapping a color or generating a new palette pushes a new history entry so the back button walks through previous palettes.
