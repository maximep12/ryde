import passport from 'koa-passport'
import moment from 'moment'
import User from 'models/user'
import { Strategy } from 'passport-local'
import _ from 'lodash'

passport.serializeUser(({ id }, done) => done(null, id))

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.query().findById(id)
    done(null, user)
  } catch (err) {
    console.log(err)
    done(err)
  }
})

passport.use(
  'local',
  new Strategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        const user = await User.query().where({ email }).first()

        if (_.isEmpty(user)) {
          return done('emailNotFound')
        }

        const match = await user.validatePassword(password)
        if (!match) {
          return done('incorrectPassword')
        }

        const now = moment().format('YYYY-MM-DD HH:mm:ss')
        const updateUser = await user.$query().patch({ last_seen: now }).first().returning('*')

        done(null, updateUser)
      } catch (err) {
        return done(err)
      }
    },
  ),
)
