import type { PanelSchema } from "@aicore-fivem/shared";

/** ai-management's panel: where each job's or gang's boss manages it. */
export const schema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "briefcase",
  files: {
    points: {
      kind: "records",
      sync: "all",
      labelPath: "label",
      newRecord: {
        label: "",
        type: "job",
        owner: "",
        coords: { x: 0, y: 0, z: 0 },
        radius: 1.5,
      },
      sections: {
        label: { type: "text", min: 1, max: 48 },
        type: { type: "enum", values: ["job", "gang"] },
        owner: { type: "text", min: 2, max: 32, pattern: "^[a-z0-9_]{2,32}$" },
        coords: { type: "vec3" },
        radius: { type: "number", min: 0.5, max: 10 },
      },
    },
  },
  tabs: [
    {
      id: "points",
      file: "points",
      icon: "briefcase",
      label: "ADMIN_TAB_POINTS",
      desc: "ADMIN_TAB_POINTS_DESC",
      listSub: "owner",
      createLabel: "ADMIN_NEW_POINT",
      deleteLabel: "ADMIN_DELETE_POINT",
      cards: [
        {
          icon: "briefcase",
          title: "ADMIN_C_POINT",
          desc: "ADMIN_C_POINT_DESC",
          fields: [
            {
              widget: "text",
              path: "label",
              label: "ADMIN_F_LABEL",
              placeholder: "ADMIN_P_LABEL",
            },
            {
              widget: "select",
              path: "type",
              label: "ADMIN_F_TYPE",
              options: [
                { value: "job", label: "ADMIN_O_JOB" },
                { value: "gang", label: "ADMIN_O_GANG" },
              ],
            },
            {
              widget: "text",
              path: "owner",
              label: "ADMIN_F_OWNER",
              hint: "ADMIN_H_OWNER",
              placeholder: "ADMIN_P_OWNER",
            },
            {
              widget: "point",
              path: "coords",
              label: "ADMIN_F_COORDS",
              hint: "ADMIN_H_COORDS",
              ground: true,
            },
            {
              widget: "number",
              path: "radius",
              label: "ADMIN_F_RADIUS",
              min: 0.5,
              max: 10,
              step: 0.5,
              unit: "m",
            },
          ],
        },
      ],
    },
  ],
};
