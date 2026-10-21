import { BoardColumnModel } from '../../core/models/board-columns';

export interface BoardColumnsState {
  items: BoardColumnModel[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

export const initialBoardColumnsState: BoardColumnsState = {
  items: [],
  loaded: false,
  loading: false,
  error: null,
};
