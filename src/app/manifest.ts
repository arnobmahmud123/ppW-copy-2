import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Property Preservation Pro",
    short_name: "ProPres",
    description: "Property preservation operations, messaging, and work order control center.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f4ff",
    theme_color: "#f8f4ff",
    icons: [
      {
        src: "/next.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
