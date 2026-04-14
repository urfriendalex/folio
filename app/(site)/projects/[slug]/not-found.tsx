import { Suspense } from "react";
import { NotFoundStage } from "@/components/not-found/NotFoundStage";

export default function ProjectNotFound() {
  return (
    <Suspense fallback={null}>
      <NotFoundStage />
    </Suspense>
  );
}
