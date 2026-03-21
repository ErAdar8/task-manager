"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NewSymbol {
  name: string;
  occurrences: number;
  source_items: string[];
}

interface NewSymbolsModalProps {
  symbols: NewSymbol[];
  isOpen: boolean;
  onClose: () => void;
  onAddSymbols: (
    symbols: Array<{
      name: string;
      category: string;
      severity: string;
      description: string;
    }>
  ) => Promise<void>;
}

export function NewSymbolsModal({
  symbols,
  isOpen,
  onClose,
  onAddSymbols,
}: NewSymbolsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(symbols.map((s) => s.name))
  );
  const [metadata, setMetadata] = useState<Map<string, { category: string; severity: string }>>(
    () =>
      new Map(
        symbols.map((s) => [s.name, { category: "block_validation", severity: "high" }])
      )
  );
  const [adding, setAdding] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async () => {
    const symbolsToAdd = Array.from(selected).map((name) => {
      const meta = metadata.get(name)!;
      const sym = symbols.find((s) => s.name === name);
      return {
        name,
        category: meta.category,
        severity: meta.severity,
        description: `Detected from ${sym?.occurrences ?? 0} successful investigations`,
      };
    });
    setAdding(true);
    try {
      await onAddSymbols(symbolsToAdd);
      onClose();
    } finally {
      setAdding(false);
    }
  };

  const toggle = (name: string) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelected(next);
  };

  const setCategory = (name: string, category: string) => {
    const next = new Map(metadata);
    const prev = next.get(name) ?? { category: "block_validation", severity: "high" };
    next.set(name, { ...prev, category });
    setMetadata(next);
  };

  const setSeverity = (name: string, severity: string) => {
    const next = new Map(metadata);
    const prev = next.get(name) ?? { category: "block_validation", severity: "high" };
    next.set(name, { ...prev, severity });
    setMetadata(next);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-slate-100">
            New Consensus Symbols Detected
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 text-sm text-slate-400">
          These symbols appeared in 3+ successful investigations but aren&apos;t in the taxonomy yet.
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {symbols.map((symbol) => (
            <div
              key={symbol.name}
              className="bg-slate-800 border border-slate-700 rounded p-3"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(symbol.name)}
                  onChange={() => toggle(symbol.name)}
                  className="mt-1 accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-200">{symbol.name}</div>
                  <div className="text-xs text-slate-400">
                    Found in {symbol.occurrences} investigations
                  </div>
                  {selected.has(symbol.name) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <select
                        value={metadata.get(symbol.name)?.category ?? "block_validation"}
                        onChange={(e) => setCategory(symbol.name, e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                      >
                        <option value="block_validation">Block validation</option>
                        <option value="script_interpreter">Script interpreter</option>
                        <option value="signature_hashing">Signature hashing</option>
                        <option value="utxo_mutation">UTXO mutation</option>
                        <option value="serialization">Serialization</option>
                        <option value="activation_logic">Activation logic</option>
                        <option value="mempool_policy">Mempool policy</option>
                        <option value="reorg_handling">Reorg handling</option>
                      </select>
                      <select
                        value={metadata.get(symbol.name)?.severity ?? "high"}
                        onChange={(e) => setSeverity(symbol.name, e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-200">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={adding || selected.size === 0}
          >
            {adding ? "Adding…" : `Add ${selected.size} Symbol${selected.size === 1 ? "" : "s"} to Taxonomy`}
          </Button>
        </div>
      </div>
    </div>
  );
}
