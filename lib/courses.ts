// Ryder Cup Course Data

export interface CourseData {
  name: string;
  pars: number[];
  strokeIndex: number[];
  totalPar: number;
}

export const STRAITS: CourseData = {
  name: 'The Straits',
  pars: [4, 5, 3, 4, 5, 4, 3, 4, 4, 4, 5, 3, 4, 4, 4, 5, 3, 4],
  strokeIndex: [15, 7, 17, 1, 5, 13, 9, 3, 11, 12, 6, 18, 14, 16, 4, 10, 8, 2],
  totalPar: 72,
};

export const RIVER: CourseData = {
  name: 'The River',
  pars: [5, 4, 4, 3, 4, 4, 4, 5, 4, 3, 5, 4, 3, 4, 4, 5, 3, 4],
  strokeIndex: [5, 13, 1, 15, 3, 17, 7, 9, 11, 14, 6, 2, 10, 16, 18, 8, 12, 4],
  totalPar: 72,
};

export const COURSES: Record<string, CourseData> = {
  straits: STRAITS,
  river: RIVER,
};
