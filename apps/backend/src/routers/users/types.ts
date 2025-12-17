import { User } from '@repo/db'

export type RequestUser = Pick<User, 'id' | 'email' | 'givenName' | 'familyName'>
