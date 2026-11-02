import { test } from "node:test";
import assert from "node:assert/strict";
import { structures } from "../../shared/structures.js";
import { nextDemoWave } from "../../frontend/dawn_admin/src/demo/workflow.js";
for (const model of structures) {
  test(`demo ${model.name}: dependency order and bounded waves`, () => {
    const completed = [];
    while (completed.length < model.nodes.length) {
      const wave = nextDemoWave(model, completed);
      assert.ok(wave.length > 0 && wave.length <= 3);
      for (const id of wave) {
        assert.ok(
          model.nodes
            .find((node) => node.id === id)
            .dependsOn.every((dependency) => completed.includes(dependency)),
        );
      }
      completed.push(...wave);
    }
    assert.equal(new Set(completed).size, model.nodes.length);
    assert.deepEqual(nextDemoWave(model, completed), []);
  });
}
