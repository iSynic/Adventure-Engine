import type { StorageProvider } from "../shared/StorageProvider";
import { EditorProvider, useEditor } from "../editor/store";
import { TutorialProvider } from "../editor/context/TutorialContext";
import ProjectsView from "../editor/views/ProjectsView";
import PlayView from "../editor/views/PlayView";
import EditorLayout from "../editor/components/layout/EditorLayout";
import { Toaster } from "../components/ui/toaster";

function EditorRoot() {
  const { state } = useEditor();

  if (!state.currentProject) {
    return <ProjectsView />;
  }

  if (state.isPlaying) {
    return <PlayView startRoomId={state.testRoomId} />;
  }

  return <EditorLayout />;
}

export default function EditorPage({
  storageProvider,
}: {
  storageProvider?: StorageProvider;
} = {}) {
  return (
    <TutorialProvider>
      <EditorProvider storageProvider={storageProvider}>
        <EditorRoot />
        <Toaster />
      </EditorProvider>
    </TutorialProvider>
  );
}
