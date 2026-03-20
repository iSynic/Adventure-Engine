import type { ConditionExpression, ComparisonOperator } from "../core/types";
import type { StateStore } from "./StateStore";
import type { InventorySystem } from "../inventory/InventorySystem";

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function compare(left: unknown, operator: ComparisonOperator, right: unknown): boolean {
  switch (operator) {
    case "==": return String(left) === String(right);
    case "!=": return String(left) !== String(right);
    case ">": return toNumber(left) > toNumber(right);
    case "<": return toNumber(left) < toNumber(right);
    case ">=": return toNumber(left) >= toNumber(right);
    case "<=": return toNumber(left) <= toNumber(right);
    default: return false;
  }
}

export function evaluateCondition(
  expr: ConditionExpression | string | undefined,
  state: StateStore,
  inventory?: InventorySystem
): boolean {
  if (expr === undefined || expr === null) return true;

  if (typeof expr === "string") {
    if (expr.trim() === "") return true;
    return state.getFlag(expr);
  }

  switch (expr.type) {
    case "flag":
      return state.getFlag(expr.flag) === (expr.value ?? true);

    case "variable": {
      const val = state.getVariable(expr.variable);
      if (val === undefined) return false;
      return compare(val, expr.operator, expr.value);
    }

    case "inventory":
      if (!inventory) return false;
      return inventory.hasItem(expr.actorId, expr.itemId);

    case "objectState": {
      const objVal = state.getObjectState(expr.objectId, expr.key);
      const op = expr.operator ?? "==";
      return compare(objVal, op, expr.value);
    }

    case "roomVisited":
      return state.hasVisitedRoom(expr.roomId);

    case "dialogueNodeSeen":
      return state.hasSeenDialogueNode(expr.treeId, expr.nodeId);

    case "hasTag": {
      const objRuntime = state.getObjectRuntimeState(expr.objectId);
      if (!objRuntime) return false;
      return objRuntime.classFlags.includes(expr.tag);
    }

    case "and":
      return expr.conditions.every((c) => evaluateCondition(c, state, inventory));

    case "or":
      return expr.conditions.some((c) => evaluateCondition(c, state, inventory));

    case "not":
      return !evaluateCondition(expr.condition, state, inventory);

    default:
      return false;
  }
}

export function conditionToString(expr: ConditionExpression | string | undefined): string {
  if (expr === undefined || expr === null) return "(always)";
  if (typeof expr === "string") return expr ? `flag "${expr}"` : "(always)";

  switch (expr.type) {
    case "flag":
      return `flag "${expr.flag}" ${expr.value === false ? "is false" : "is true"}`;
    case "variable":
      return `"${expr.variable}" ${expr.operator} ${JSON.stringify(expr.value)}`;
    case "inventory":
      return `${expr.actorId} has "${expr.itemId}"`;
    case "objectState":
      return `object "${expr.objectId}".${expr.key} ${expr.operator ?? "=="} ${JSON.stringify(expr.value)}`;
    case "roomVisited":
      return `room "${expr.roomId}" visited`;
    case "dialogueNodeSeen":
      return `node "${expr.nodeId}" in tree "${expr.treeId}" seen`;
    case "hasTag":
      return `object "${expr.objectId}" hasTag "${expr.tag}"`;
    case "and":
      return `(${expr.conditions.map(conditionToString).join(" AND ")})`;
    case "or":
      return `(${expr.conditions.map(conditionToString).join(" OR ")})`;
    case "not":
      return `NOT ${conditionToString(expr.condition)}`;
    default:
      return "(unknown)";
  }
}
