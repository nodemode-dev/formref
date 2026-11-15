import { api } from '../lib/api';
import { S, fit, open, toast } from './editor';
import { registry } from './registry';

export interface Demo { id: string; title: string; line: string; picture: string; file: string }

const demo = (id: string, title: string, line: string): Demo => ({ id, title, line, picture: `/demos/${id}/cover.webp`, file: `/demos/${id}/board.formref` });

/** The demo boards that ship in `frontend/public/demos/<id>/`: a board file and the card picture, one of the board's own. */
export const DEMOS: Demo[] = [
  demo('colour', 'First light: a colour board', 'NASA pictures cropped to one size and sorted by colour, with an extracted palette and saved colour searches.'),
  demo('value', 'Value study: light and shadow', 'Value studies from two to eight levels, a drawing grid and a compare pair on a grayscale canvas, ready for timed practice.'),
  demo('poster', 'Red planet: poster project', 'A poster brief with rated candidates, a palette, thumbnails, a budget table and labelled connections.'),
];

let opening = false;

/** Imports the demo's board file as a new board, opens it and fits the view; no existing board is touched. */
export async function openDemo(id: string): Promise<void> {
  const found = DEMOS.find(entry => entry.id === id);
  if (!found) return;
  if (opening) { toast('A demo is still opening.'); return; }
  opening = true;
  toast('Opening the demo…');
  try {
    const response = await fetch(found.file);
    if (!response.ok) throw new Error(String(response.status));
    const result = await api.import(new File([await response.blob()], `${found.id}.formref`));
    await open(result.board.id, result);
    if (S.state?.board.id === result.board.id) fit();
  } catch {
    toast('The demo could not open.');
  } finally {
    opening = false;
  }
}

export function registerDemos(): void {
  registry.add(...DEMOS.map(entry => ({
    group: 'Help', id: `demo-${entry.id}`, label: entry.title, icon: 'board' as const, run: () => openDemo(entry.id),
    description: `Opens the demo board "${entry.title}" as a new board and fits the view. Existing boards are not changed.`,
  })));
}
