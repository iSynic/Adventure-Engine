import { useEffect, useCallback, useState } from "react";
import type { EditorProject, EditorAction } from "../types";
import type { ValidationError } from "../../shared/exportSchema";
import { validateProjectForExport } from "../utils/projectToConfig";

export function useEditorShortcuts(
  saveCurrentProject: () => void,
  dispatch: (action: EditorAction) => void,
) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveCurrentProject();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveCurrentProject, dispatch]);
}

export interface ValidationState {
  validationErrors: ValidationError[];
  validationAction: "play" | "export" | null;
  pendingTestRoomId: string | null;
}

export function useProjectValidation(
  project: EditorProject | null,
  selectedRoomId: string | null | undefined,
  dispatch: (action: EditorAction) => void,
  setShowExport: (show: boolean) => void,
) {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationAction, setValidationAction] = useState<"play" | "export" | null>(null);
  const [pendingTestRoomId, setPendingTestRoomId] = useState<string | null>(null);

  const handlePlayClick = useCallback(() => {
    if (!project) return;
    setPendingTestRoomId(null);
    const result = validateProjectForExport(project);
    const errors = result.errors.filter((e) => e.severity === "error");
    const warnings = result.errors.filter((e) => e.severity === "warning");
    if (errors.length > 0) {
      setValidationErrors(result.errors);
      setValidationAction("play");
    } else if (warnings.length > 0) {
      setValidationErrors(warnings);
      setValidationAction("play");
    } else {
      dispatch({ type: "SET_PLAYING", playing: true });
    }
  }, [project, dispatch]);

  const handleTestRoomClick = useCallback(() => {
    const roomId = selectedRoomId;
    if (!project || !roomId) return;
    setPendingTestRoomId(roomId);
    const result = validateProjectForExport(project);
    const errors = result.errors.filter((e) => e.severity === "error");
    const warnings = result.errors.filter((e) => e.severity === "warning");
    if (errors.length > 0) {
      setValidationErrors(result.errors);
      setValidationAction("play");
    } else if (warnings.length > 0) {
      setValidationErrors(warnings);
      setValidationAction("play");
    } else {
      dispatch({ type: "SET_PLAYING", playing: true, testRoomId: roomId });
    }
  }, [project, selectedRoomId, dispatch]);

  const handleExportClick = useCallback(() => {
    if (!project) return;
    const result = validateProjectForExport(project);
    const errors = result.errors.filter((e) => e.severity === "error");
    const warnings = result.errors.filter((e) => e.severity === "warning");
    if (errors.length > 0) {
      setValidationErrors(result.errors);
      setValidationAction("export");
    } else if (warnings.length > 0) {
      setValidationErrors(warnings);
      setValidationAction("export");
    } else {
      setShowExport(true);
    }
  }, [project, setShowExport]);

  const dismissValidation = useCallback(() => {
    setValidationErrors([]);
    setValidationAction(null);
  }, []);

  const proceedValidation = useCallback(() => {
    const action = validationAction;
    const testRoom = pendingTestRoomId;
    setValidationErrors([]);
    setValidationAction(null);
    setPendingTestRoomId(null);
    if (action === "play") {
      dispatch({ type: "SET_PLAYING", playing: true, testRoomId: testRoom });
    } else {
      setShowExport(true);
    }
  }, [validationAction, pendingTestRoomId, dispatch, setShowExport]);

  return {
    validationErrors,
    validationAction,
    handlePlayClick,
    handleTestRoomClick,
    handleExportClick,
    dismissValidation,
    proceedValidation,
  };
}
