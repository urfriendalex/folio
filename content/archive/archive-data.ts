import { archiveManifest } from "@/lib/generated/archive-manifest";

const archiveMeta = [
  {
    title: "Signal Draft 01",
    year: "2025",
    medium: "Interface study",
    note: "Early compositional test for screen rhythm and contrast handling.",
  },
  {
    title: "Window Relay 02",
    year: "2025",
    medium: "Editorial frame",
    note: "A cropped framing experiment built around layered panels and offset captions.",
  },
  {
    title: "Orbit Plate 03",
    year: "2024",
    medium: "Motion still",
    note: "Static capture from a wider motion sequence exploring controlled drift.",
  },
  {
    title: "Surface Study 04",
    year: "2025",
    medium: "Material pass",
    note: "Texture and lighting pass focused on depth without heavy ornament.",
  },
  {
    title: "Quiet Frame 05",
    year: "2024",
    medium: "Composition test",
    note: "Balance exercise for empty space, weight, and off-axis focal points.",
  },
  {
    title: "Trace Record 06",
    year: "2025",
    medium: "Process capture",
    note: "Documentation artifact kept for its layering logic rather than the final polish.",
  },
  {
    title: "Channel Mockup 07",
    year: "2024",
    medium: "Prototype still",
    note: "Variation from a system prototype where structure mattered more than fidelity.",
  },
  {
    title: "Afterimage 08",
    year: "2025",
    medium: "Archive fragment",
    note: "Residual frame saved as a reference for pacing, density, and spacing.",
  },
] as const;

export type ArchiveEntry = {
  id: string;
  image: string;
  width: number;
  height: number;
  title: string;
  year: string;
  medium: string;
  note: string;
  indexLabel: string;
};

export const archiveEntries: ArchiveEntry[] = archiveManifest.map((item, index) => {
  const meta = archiveMeta[index] ?? {
    title: `Archive Study ${String(index + 1).padStart(2, "0")}`,
    year: "2025",
    medium: "Archive fragment",
    note: "Unsorted visual material kept for reference and future recomposition.",
  };

  return {
    id: item.src,
    image: item.src,
    width: item.width,
    height: item.height,
    title: meta.title,
    year: meta.year,
    medium: meta.medium,
    note: meta.note,
    indexLabel: String(index + 1).padStart(2, "0"),
  };
});
