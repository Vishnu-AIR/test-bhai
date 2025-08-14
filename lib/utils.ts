import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export default async function fetchPromptFromSheet() {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcbyRJdN_iIMtgncjishiFKSo-PwkoAfdwUHogw94_h3WQFcmXwNlRD9sBAB3nRXmvS0qNtNKx5GEb/pub?output=csv';

  const res = await fetch(csvUrl);
  const text = await res.text();
  // const rows = text.split('\n');
  const prompt = text.trim(); // Assuming prompt is in cell A1
  return prompt;
}