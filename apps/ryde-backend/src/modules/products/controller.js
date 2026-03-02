import fs from 'fs'
import moment from 'moment'
import * as productsHelpers from 'modules/products/helpers'

import Product from 'models/product'
import ProductFormat from 'models/productFormat'

import { getJsonFromFile } from 'helpers'
import { saveDataUsingTempTable } from 'lib/FileParser/fileParser'
import { INIT_FILES } from 'utils/constants'

export async function createFromCsv(ctx) {
  try {
    console.log(`temp/${INIT_FILES.prod.products}`)
    await saveDataUsingTempTable({
      csvStream: fs.createReadStream(`temp/${INIT_FILES.prod.products}`),
      fileDelimiter: ',',
      validateRow: (record) => {
        const { source_id: id = null, maktx: name = null, maktg: description = null, ean11: upc = null } = record

        return [id, name, description, upc, true].join('\t') + '\n'
      },
      tempTable: `products_${moment().milliseconds()}_temp`,
      insertionTable: 'products',
      tempTableAttrList: 'id,name,description,upc,is_wsc',
      validateAndInsert: ({ client, tempTable }) => productsHelpers.validateAndInsertProducts({ client, tempTable }),
    })

    const products = await Product.query().select()
    ctx.body = { products }
  } catch (error) {
    console.log(error)
  }
}

export async function createFormatsFromCsv(ctx) {
  try {
    const values = getJsonFromFile({ filePath: `temp/${INIT_FILES.prod.dimensions}` })

    const formatToInsert = values.map((record) => {
      const { sourceId: productSku, umrez: numerator = null, umren: denominator = null, ean11: upc = null } = record
      let { meinh: unitOfMeasure } = record

      if (unitOfMeasure === 'KAR') unitOfMeasure = 'CAR'

      return { productSku, numerator, denominator, unit: unitOfMeasure, upc }
    })

    const createdFormats = await ProductFormat.query().insert(formatToInsert)

    ctx.body = { productFormats: createdFormats }
  } catch (error) {
    console.log(error)
  }
}
