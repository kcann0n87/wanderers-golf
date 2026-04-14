// Wanderers Golf Club - Course Data (from physical scorecard)

export const PARS = [4, 5, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4];
export const STROKE_INDEX = [7, 3, 11, 5, 13, 1, 9, 17, 15, 10, 12, 6, 18, 8, 16, 2, 14, 4];
export const TOTAL_PAR = 72;

// Tee data from scorecard
export const TEES_DATA = [
  {
    name: 'Black',
    slope: 144,
    rating: 75.1,
    total_yards: 7052,
    hole_yards: [416, 579, 225, 453, 169, 449, 552, 330, 363, 392, 222, 566, 362, 406, 219, 421, 501, 427],
  },
  {
    name: 'Blue',
    slope: 139,
    rating: 72.4,
    total_yards: 6585,
    hole_yards: [402, 548, 201, 421, 148, 404, 513, 307, 340, 361, 203, 545, 337, 383, 192, 398, 482, 400],
  },
  {
    name: 'Green',
    slope: 130,
    rating: 70.0,
    total_yards: 6129,
    hole_yards: [387, 526, 167, 395, 138, 382, 482, 294, 305, 349, 188, 485, 300, 369, 168, 385, 445, 364],
  },
  {
    name: 'Gold',
    slope: 125,
    rating: 68.0,
    total_yards: 5517,
    hole_yards: [310, 452, 151, 365, 120, 367, 409, 268, 274, 332, 168, 462, 264, 341, 146, 350, 388, 350],
  },
  {
    name: 'Silver',
    slope: 116,
    rating: 65.6,
    total_yards: 4739,
    hole_yards: [279, 408, 135, 317, 82, 318, 380, 227, 245, 284, 129, 383, 230, 273, 100, 283, 353, 313],
  },
];
