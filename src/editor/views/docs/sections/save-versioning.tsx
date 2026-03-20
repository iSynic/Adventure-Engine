export function SaveVersioningSection() {
  return (
    <section>
      <h3>Save Format Versioning</h3>
      <p>
        The editor's project file format uses <strong>format versioning</strong> to ensure
        backward compatibility as features are added. Each saved project includes a
        <code>formatVersion</code> field that identifies which version of the schema it uses.
      </p>
      <h4>How It Works</h4>
      <ul>
        <li>When you save a project, the editor writes the current <code>formatVersion</code> (currently <code>2</code>).</li>
        <li>When you open a project, the editor checks the <code>formatVersion</code> and applies any necessary <strong>migrations</strong> to bring older files up to the current format.</li>
        <li>Migrations are applied automatically and silently — you don't need to do anything.</li>
        <li>If a project file has no <code>formatVersion</code> (pre-versioning files), the editor treats it as version 0 and applies all migrations from the beginning.</li>
      </ul>
      <h4>Import Validation</h4>
      <p>
        When importing a <code>.advproject.json</code> file, the editor validates the file
        structure before loading:
      </p>
      <ul>
        <li>Checks that all required top-level fields are present.</li>
        <li>Validates that referenced IDs are consistent (e.g., starting room exists, player actor exists).</li>
        <li>Applies format migrations if the file uses an older format version.</li>
        <li>Rejects files with invalid JSON or missing critical data with a clear error message.</li>
      </ul>
      <h4>Project Migration Pipeline</h4>
      <p>
        The migration system in <code>projectMigration.ts</code> defines a series of
        transform functions, one per version bump. Each migration modifies the project
        data in place — adding new default fields, restructuring data, or converting
        deprecated formats. This ensures that projects created at any point in the
        engine's history can be opened in the latest editor.
      </p>
    </section>
  );
}
