"use client";

import { useState, useCallback, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/Button";
import { findDatasetId } from "@/services/carbon/dataset";

// Phase 3 Validation Layer
// Users must confirm, correct, add, or remove detected foods before carbon analysis.
// Only validated foods reach the Carbon Scoring Service.

interface FoodValidationProps {
  detectedFoods: string[];
  onValidated: (foods: string[]) => void;
  onCancel: () => void;
  confidence: number;
}

interface FoodItem {
  id: string;
  name: string;
  inDataset: boolean;
  checked: boolean;
}

export function FoodValidation({
  detectedFoods,
  onValidated,
  onCancel,
  confidence,
}: FoodValidationProps) {
  const baseId = useId();

  const [items, setItems] = useState<FoodItem[]>(() =>
    detectedFoods.map((food, i) => ({
      id: `${baseId}-${i}`,
      name: food,
      inDataset: !!findDatasetId(food),
      checked: true,
    }))
  );
  const [newFoodInput, setNewFoodInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const startEdit = useCallback((item: FoodItem) => {
    setEditingId(item.id);
    setEditValue(item.name);
  }, []);

  const commitEdit = useCallback(
    (id: string) => {
      const trimmed = editValue.trim().toLowerCase();
      if (!trimmed) {
        setEditingId(null);
        return;
      }
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, name: trimmed, inDataset: !!findDatasetId(trimmed) }
            : item
        )
      );
      setEditingId(null);
    },
    [editValue]
  );

  const addFood = useCallback(() => {
    const trimmed = newFoodInput.trim().toLowerCase();
    if (!trimmed) return;
    setItems((prev) => [
      ...prev,
      {
        id: `${baseId}-add-${Date.now()}`,
        name: trimmed,
        inDataset: !!findDatasetId(trimmed),
        checked: true,
      },
    ]);
    setNewFoodInput("");
  }, [newFoodInput, baseId]);

  const handleSubmit = useCallback(() => {
    const validated = items.filter((i) => i.checked).map((i) => i.name);
    if (validated.length === 0) return;
    onValidated(validated);
  }, [items, onValidated]);

  const checkedCount = items.filter((i) => i.checked).length;
  const checkedInDataset = items.filter((i) => i.checked && i.inDataset).length;

  return (
    <section
      aria-labelledby="validation-heading"
      className="space-y-6"
    >
      <div>
        <h2
          id="validation-heading"
          className="text-xl font-bold text-carbon-50"
        >
          Confirm Detected Foods
        </h2>
        <p className="text-carbon-400 text-sm mt-1">
          Detection confidence:{" "}
          <span className="text-leaf-400 font-semibold">
            {Math.round(confidence * 100)}%
          </span>
          . Review, correct, or add items before analysis.
        </p>
      </div>

      {/* Food checklist */}
      <fieldset aria-label="Detected food items">
        <legend className="sr-only">Select foods to include in carbon analysis</legend>
        <ul className="space-y-2" role="list">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16, height: 0 }}
                transition={{ duration: 0.2 }}
                className="glass rounded-xl px-4 py-3 flex items-center gap-3"
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  id={`food-${item.id}`}
                  checked={item.checked}
                  onChange={() => toggleItem(item.id)}
                  className="w-4 h-4 rounded accent-leaf-500 cursor-pointer flex-shrink-0"
                  aria-label={`Include ${item.name}`}
                />

                {/* Food name — editable */}
                {editingId === item.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(item.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 bg-carbon-800 border border-leaf-500/40 rounded-lg px-2 py-1 text-carbon-50 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/50"
                    autoFocus
                    aria-label="Edit food name"
                  />
                ) : (
                  <label
                    htmlFor={`food-${item.id}`}
                    className="flex-1 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-carbon-100 text-sm capitalize">
                      {item.name}
                    </span>
                    {!item.inDataset && (
                      <span
                        className="text-xs text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 rounded"
                        title="Not in carbon dataset — will not contribute to score"
                      >
                        Not in dataset
                      </span>
                    )}
                  </label>
                )}

                {/* Edit / Remove buttons */}
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="p-1.5 rounded-lg text-carbon-500 hover:text-leaf-400 hover:bg-leaf-500/10 transition-colors"
                    aria-label={`Edit ${item.name}`}
                    title="Edit food name"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-lg text-carbon-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label={`Remove ${item.name}`}
                    title="Remove this food"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </fieldset>

      {/* Add new food */}
      <div className="flex gap-2" role="group" aria-label="Add food item">
        <input
          type="text"
          value={newFoodInput}
          onChange={(e) => setNewFoodInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addFood();
          }}
          placeholder="Add a food item…"
          className="flex-1 bg-carbon-900 border border-carbon-700 rounded-xl px-4 py-2.5 text-carbon-100 placeholder:text-carbon-600 text-sm focus:outline-none focus:ring-2 focus:ring-leaf-500/50 focus:border-leaf-500/40"
          aria-label="New food name"
          id="new-food-input"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={addFood}
          disabled={!newFoodInput.trim()}
          aria-label="Add food item"
        >
          Add
        </Button>
      </div>

      {/* Summary */}
      <p className="text-carbon-400 text-sm" aria-live="polite" aria-atomic="true">
        {checkedCount} food{checkedCount !== 1 ? "s" : ""} selected
        {checkedInDataset < checkedCount && (
          <span className="text-yellow-400">
            {" "}· {checkedCount - checkedInDataset} not in carbon dataset
          </span>
        )}
      </p>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit}
          disabled={checkedCount === 0}
          aria-label={`Analyze ${checkedCount} selected food items`}
        >
          Analyze {checkedCount} Food{checkedCount !== 1 ? "s" : ""}
        </Button>
        <Button variant="ghost" size="md" onClick={onCancel}>
          Rescan
        </Button>
      </div>
    </section>
  );
}
