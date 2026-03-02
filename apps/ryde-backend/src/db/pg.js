import pg from 'pg'
import config from 'config'

export default new pg.Pool(config.pg)
