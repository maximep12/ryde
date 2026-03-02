import Model from './abstract/base'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import config from 'config'

import path from 'path'

export default class User extends Model {
  static tableName = 'users'

  get secureFields() {
    return ['passwordHash']
  }

  static relationMappings = {
    role: {
      relation: Model.BelongsToOneRelation,
      modelClass: path.join(__dirname, 'userRole'),
      join: {
        from: 'users.role_id',
        to: 'user_roles.id',
      },
    },
  }

  async validatePassword(password) {
    return await bcrypt.compare(password, this.passwordHash)
  }

  async hashPassword() {
    const salt = await bcrypt.genSalt(10)
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
  }

  generateInviteToken() {
    return crypto.randomBytes(32).toString('hex')
  }

  generateToken() {
    return jwt.sign({ id: this.id, email: this.email, role: this.role?.role }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    })
  }
}
