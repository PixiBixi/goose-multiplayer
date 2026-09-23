import { describe, expect, it } from 'vitest'
import { Room } from './room.js'

const room = () => new Room('HKD4P2')

describe('Room, lobby', () => {
  it('seats the first joiner as host on seat zero', () => {
    const r = room()
    expect(r.join('Jérémy', 's1')).toBe(0)
    expect(r.hostSeat).toBe(0)
  })

  it('seats joiners in order up to six', () => {
    const r = room()
    for (let i = 0; i < 6; i++) expect(r.join(`p${i}`, `s${i}`)).toBe(i)
    expect(() => r.join('p6', 's6')).toThrow(/full/i)
  })

  it('hands a seat left in the lobby to the next joiner', () => {
    const r = room()
    for (let i = 0; i < 6; i++) r.join(`p${i}`, `s${i}`)
    r.leave(2)
    expect(r.join('late', 's-late')).toBe(2)
    expect(r.view(2).you.name).toBe('late')
    expect(r.seatCount).toBe(6)
  })

  it('hands the host role to the next seated player when the host leaves', () => {
    // Otherwise nobody left in the lobby can change the rules or start.
    const r = room()
    r.join('a', 's0')
    r.join('b', 's1')
    r.join('c', 's2')
    r.leave(0)
    expect(r.hostSeat).toBe(1)
    expect(() => r.start(1)).not.toThrow()
  })

  it('hands it on when the host drops, and does not hand it back', () => {
    const r = room()
    r.join('a', 's0')
    r.join('b', 's1')
    r.setPresence(0, 'disconnected')
    expect(r.hostSeat).toBe(1)
    r.setPresence(0, 'active')
    expect(r.hostSeat).toBe(1)
  })

  it('gives it to whoever sits down at a table nobody is left at', () => {
    const r = room()
    r.join('a', 's0')
    r.join('b', 's1')
    r.setPresence(1, 'disconnected')
    r.setPresence(0, 'disconnected')
    r.setPresence(1, 'active')
    expect(r.hostSeat).toBe(1)
  })

  it('lets the host change the rules before the start', () => {
    const r = room()
    r.join('host', 's0')
    r.join('guest', 's1')
    r.configure(0, { twoDice: false })
    expect(r.view(0).config.twoDice).toBe(false)
    r.configure(0, { doubleAgain: false, tripleDouble: 'restart' })
    expect(r.view(0).config.doubleAgain).toBe(false)
    expect(r.view(0).config.tripleDouble).toBe('restart')
  })

  it('refuses a rule change from anyone but the host', () => {
    const r = room()
    r.join('host', 's0')
    r.join('guest', 's1')
    expect(() => r.configure(1, { twoDice: false })).toThrow(/host/i)
  })

  it('refuses to start below two seats', () => {
    const r = room()
    r.join('host', 's0')
    expect(() => r.start(0)).toThrow(/two/i)
  })

  it('refuses a rule change once the game has started', () => {
    const r = room()
    r.join('host', 's0')
    r.join('guest', 's1')
    r.start(0)
    expect(() => r.configure(0, { twoDice: false })).toThrow(/started/i)
  })

  it('shows a joining player their own seat and nobody else as you', () => {
    const r = room()
    r.join('host', 's0')
    r.join('guest', 's1')
    expect(r.view(1).you).toEqual({ seat: 1, name: 'guest' })
  })
})
