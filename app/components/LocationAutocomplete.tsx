"use client";

import { useState } from "react";
import { searchCities } from "../data/cityIndex";



export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
}) {
  const [results, setResults] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [hasSelected, setHasSelected] = useState(false);

  const searchLocation = (text: string) => {
  onChange(text);
  setHasSelected(false);

  const trimmed = text.trim();
  if (trimmed.length < 2) {
    setResults([]);
    setOpen(false);
    return;
  }

  const matches = searchCities(trimmed, 8); // top 8 matches
  setResults(matches);
  setOpen(matches.length > 0);
};


  return (
    <div className="relative w-full">
      <input
        className="block w-full p-2 rounded bg-gray-800 border border-gray-700"
  placeholder="Search city..."
  value={value}
  onChange={(e) => searchLocation(e.target.value)}
  onFocus={() => results.length && setOpen(true)}
  onBlur={() => setTimeout(() => setOpen(false), 120)}
/>

      

      {open && results.length > 0 && (
  <ul className="absolute z-50 left-0 right-0 bg-gray-900 border border-gray-700 rounded mt-1 max-h-60 overflow-auto text-white text-sm">
    {results.map((label) => (
      <li
        key={label}
        className="p-2 hover:bg-gray-700 cursor-pointer"
        onMouseDown={(e) => e.preventDefault()} // prevents blur closing before click
        onClick={() => {
          onSelect(label);
          onChange(label);
          setHasSelected(true);
          setResults([]);
          setOpen(false);
        }}
      >
        {label}
      </li>
    ))}
  </ul>
)}
      {!hasSelected && value.trim().length >= 2 && results.length === 0 && (
  <div className="absolute left-0 right-0 bg-gray-900 text-gray-400 p-2 text-sm border border-gray-700 rounded mt-1 z-50">
    No matches found. Keep typing or enter manually.
  </div>
)}
    </div>
  );
}