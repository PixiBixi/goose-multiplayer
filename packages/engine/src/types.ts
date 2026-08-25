/** 0 is the start, off the board. 1 to 63 are the printed squares. */
export type Square = number
export type Seat = number
export type BlockReason = 'well' | 'prison'

export type TableConfig = {
  exactFinish: boolean
  twoDice: boolean
  rescue: boolean
  opening9: boolean
  mode: 'classic' | 'cards'
}
