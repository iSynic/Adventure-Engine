export function UndoRedoSection() {
  return (
    <section>
      <h3>Undo / Redo</h3>
      <p>
        The editor supports full undo and redo for all project changes. Every edit you make —
        adding a room, moving an object, editing a script, changing a property — is recorded
        in an undo stack.
      </p>
      <h4>Keyboard Shortcuts</h4>
      <table>
        <thead>
          <tr><th>Action</th><th>Windows / Linux</th><th>macOS</th></tr>
        </thead>
        <tbody>
          <tr><td>Undo</td><td><kbd>Ctrl+Z</kbd></td><td><kbd>Cmd+Z</kbd></td></tr>
          <tr><td>Redo</td><td><kbd>Ctrl+Shift+Z</kbd></td><td><kbd>Cmd+Shift+Z</kbd></td></tr>
        </tbody>
      </table>
      <h4>How It Works</h4>
      <ul>
        <li>Each significant change pushes a snapshot onto the undo stack.</li>
        <li>Undo restores the previous project state; redo re-applies the undone change.</li>
        <li>The redo stack is cleared whenever you make a new change after undoing.</li>
        <li>Undo/redo covers all project data: rooms, objects, actors, items, scripts, dialogue trees, assets, and settings.</li>
      </ul>
      <h4>Tips</h4>
      <ul>
        <li>Use undo liberally when experimenting with room layouts or walkbox shapes.</li>
        <li>If you accidentally delete an entity, <kbd>Ctrl+Z</kbd> brings it right back.</li>
        <li>Undo history is kept in memory for the current editing session. It resets when you close and reopen a project.</li>
      </ul>
    </section>
  );
}
