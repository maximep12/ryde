import config from 'config'
import moment from 'moment'

import SFTP from 'lib/SFTP/sftp'
import { sendSlackNotification, SLACK_CONTEXT } from 'lib/slack'

import Report from 'models/report'

import { APP_ROLES, REPORTS, UPLOAD_RESULT_STATES } from 'utils/constants'
import {
  createCentralMarketData,
  createCircleKData,
  createCircleKQcAtlData,
  createNapOrangeData,
  createLoblawsData,
  createParklandData,
  createPetroCanadaData,
  createRabbaData,
  updateCentralMarketReport,
  updateCircleKReport,
  updateLoblawsReport,
  updateParklandReport,
  updatePetroCanadaReport,
  updateRabbaReport,
  create7ElevenData,
  update7ElevenReport,
  updateNapOrangeReport,
  createSobeysData,
  updateSobeysReport,
} from './helpers'
import { uploadFileToS3 } from 'lib/FileDownloader/upload'

export async function importRabbaSales(ctx) {
  console.log('[REPORT] - Rabba start')
  const reportStart = moment().format()
  const userIsRabba = ctx.request.header.authorization === config.tokens[APP_ROLES.rabba]
  const file = ctx.req
  const fileName = ctx.request.header['content-disposition'].replace('filename=', !userIsRabba ? 'ADMIN_' : '')

  const newReport = await Report.query().insert({
    type: REPORTS.rabba,
    reportStart,
    fileName,
    notifSent: false,
  })

  const fileContent = await new Response(file).text()

  let savedS3Name

  try {
    if (userIsRabba) {
      const s3FileName = await addFileToS3({ fileName, fileContent, bucket: config.amazonS3.buckets.rabba })
      savedS3Name = s3FileName
      createRabbaData({ fileContent })
        .then(
          async (res) => await updateRabbaReport({ fileName: savedS3Name ?? fileName, reportId: newReport.id, res }),
        )
        .catch(async (error) => await logRabbaUploadError({ error, isAdmin: false, reportId: newReport.id }))
      console.log('[REPORT] - Rabba success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.rabba })
      ctx.body = { result: { status: UPLOAD_RESULT_STATES.success } }
    } else {
      const s3FileName = await addFileToS3({ fileName, fileContent, bucket: config.amazonS3.buckets.rabba })
      const res = await createRabbaData({ fileContent })
      const { received, ordersCreated, ordersUpdated, rejected, createdRows, updatedRows, deletedRows, identicalRows } =
        res

      savedS3Name = s3FileName

      console.log('[REPORT] - Rabba success')
      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.rabba })
      await updateRabbaReport({ fileName: savedS3Name ?? fileName, reportId: newReport.id, res })

      ctx.body = {
        result: {
          created: ordersCreated,
          updated: ordersUpdated,
          unit: 'Rabba orders',
          status: rejected.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: {
          received,
          rejected: rejected.length,
          created: createdRows,
          updated: updatedRows,
          deleted: deletedRows,
          identical: identicalRows,
        },
        warnings: rejected,
      }
    }
  } catch (error) {
    await logRabbaUploadError({ error, isAdmin: !userIsRabba, reportId: newReport.id })

    const { code } = error

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Rabba end')
  }
}

async function logRabbaUploadError({ error, isAdmin, reportId }) {
  console.log('[REPORT] - Rabba error: ', error)
  await sendSlackNotification({ error, context: SLACK_CONTEXT.rabba, sentByAdmin: isAdmin })
  await Report.query()
    .update({
      failure: error.message,
      reportEnd: moment().format(),
      notifSent: true,
    })
    .where('id', reportId)
}

export async function importCircleKQcAtlSales(ctx) {
  console.log('[REPORT] - Circle K QC ATL start')
  const reportStart = moment().format()
  const fileName = ctx.request.header['content-disposition'].replace('filename=', 'ADMIN_')
  const file = ctx.req

  const newReport = await Report.query().insert({
    type: REPORTS.circleK.qcAtl,
    reportStart,
    fileName,
    notifSent: false,
  })

  const fileContent = await new Response(file).blob()

  try {
    const { result, rows } = await createCircleKQcAtlData({
      fileContent: fileContent.stream(),
    })

    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.circleK })
    await updateCircleKReport({ fileName, reportId: newReport.id, rows })

    ctx.body = {
      result: {
        created: result.ordersCreated,
        updated: result.ordersUpdated,
        unit: 'Circle K QC+ATL orders',
        status: rows.rejected.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
      },
      rows: {
        received: rows.received,
        rejected: rows.rejected.length,
        created: rows.createdRows,
        updated: rows.updatedRows,
        deleted: rows.deletedRows,
        identical: rows.identicalRows,
      },
      warnings: rows.rejected,
    }
  } catch (error) {
    await logCircleKUploadError({ error, isAdmin: true, reportId: newReport.id })

    const { code } = error

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Circle K QC ATL end')
  }
}

export async function importCircleKSales(ctx) {
  console.log('[REPORT] - Circle K start')
  const reportStart = moment().format()
  const userIsCircleK = ctx.request.header.authorization === config.tokens[APP_ROLES.circleK]
  const fileName = ctx.request.header['content-disposition'].replace('filename=', userIsCircleK ? '' : 'ADMIN_')
  const file = ctx.req

  const newReport = await Report.query().insert({
    type: REPORTS.circleK.global,
    reportStart,
    fileName,
    notifSent: false,
  })

  /*
   * Create the blob and call the .stream() when you need to use it.
   * S3 closes the stream once done with it. So it will work locally
   * if you do not save it, but will crash after you saved it...
   */
  const fileContent = await new Response(file).blob()

  let savedS3Name

  try {
    if (userIsCircleK) {
      const s3FileName = await addFileToS3({ fileName, fileContent, bucket: config.amazonS3.buckets.circleK })
      savedS3Name = s3FileName
      createCircleKData({ fileName, fileContent: fileContent.stream(), s3FileName })
        .then(async (res) => {
          const { rows, dataImportId } = res

          await sendSlackNotification({ success: true, context: SLACK_CONTEXT.circleK })
          await updateCircleKReport({ fileName: savedS3Name ?? fileName, reportId: newReport.id, rows, dataImportId })
        })
        .catch(async (error) => await logCircleKUploadError({ error, isAdmin: false, reportId: newReport.id }))
      ctx.body = { result: { status: UPLOAD_RESULT_STATES.success } }
    } else {
      const s3FileName = await addFileToS3({
        fileName,
        fileContent: fileContent.stream(),
        bucket: config.amazonS3.buckets.circleK,
      })
      savedS3Name = s3FileName

      const { result, rows, dataImportId } = await createCircleKData({
        fileName,
        fileContent: fileContent.stream(),
        s3FileName,
      })

      await sendSlackNotification({ success: true, context: SLACK_CONTEXT.circleK })
      await updateCircleKReport({ fileName: savedS3Name ?? fileName, reportId: newReport.id, rows, dataImportId })

      ctx.body = {
        result: {
          created: result.ordersCreated,
          updated: result.ordersUpdated,
          unit: 'Circle K orders',
          status: rows.rejected.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
        },
        rows: {
          received: rows.received,
          rejected: rows.rejected.length,
          created: rows.createdRows,
          updated: rows.updatedRows,
          deleted: rows.deletedRows,
          identical: rows.identicalRows,
        },
        warnings: rows.rejected,
      }
    }
  } catch (error) {
    await logCircleKUploadError({ error, isAdmin: !userIsCircleK, reportId: newReport.id })

    const { code } = error

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Circle K end')
  }
}

export async function importCentralMarketSales(ctx) {
  console.log('[REPORT] - Central Market start')
  const reportStart = moment().format()
  const fileName = ctx.request.header['content-disposition'].replace('filename=', 'ADMIN_')
  const file = ctx.req

  const newReport = await Report.query().insert({
    type: REPORTS.centralMarket,
    reportStart,
    fileName,
    notifSent: false,
  })

  /*
   * Create the blob and call the .stream() when you need to use it.
   * S3 closes the stream once done with it. So it will work locally
   * if you do not save it, but will crash after you saved it...
   */
  const fileContent = await new Response(file).blob()

  let savedS3Name

  try {
    const s3FileName = `central-market-temp_${new Date().getMilliseconds()}` /* await addFileToS3({
      fileName,
      fileContent: fileContent.stream(),
      bucket: config.amazonS3.buckets.circleK,
    }) */
    savedS3Name = s3FileName

    const { result, rows, dataImportId } = await createCentralMarketData({
      fileName,
      fileContent: fileContent.stream(),
      s3FileName,
    })

    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.centralMarket })
    await updateCentralMarketReport({ fileName: savedS3Name ?? fileName, reportId: newReport.id, rows, dataImportId })

    ctx.body = {
      result: {
        created: result.ordersCreated,
        updated: result.ordersUpdated,
        unit: 'Central Market orders',
        status: rows.rejected.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
      },
      rows: {
        received: rows.received,
        rejected: rows.rejected.length,
        created: rows.createdRows,
        updated: rows.updatedRows,
        deleted: rows.deletedRows,
        identical: rows.identicalRows,
      },
      warnings: rows.rejected,
    }
  } catch (error) {
    await logCentralMarketUploadError({ error, reportId: newReport.id })

    const { code } = error

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Central Market end')
  }
}

export async function importNapOrangeSales(ctx) {
  console.log('[REPORT] - NAP Orange start')
  const reportStart = moment().format()
  const fileName = ctx.request.header['content-disposition'].replace('filename=', 'ADMIN_')
  const file = ctx.req

  const newReport = await Report.query().insert({
    type: REPORTS.napOrange,
    reportStart,
    fileName,
    notifSent: false,
  })

  const fileContent = await new Response(file).blob()

  try {
    const { result, rows } = await createNapOrangeData({
      fileContent: fileContent.stream(),
    })

    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.napOrange })
    await updateNapOrangeReport({ fileName, reportId: newReport.id, rows })

    ctx.body = {
      result: {
        created: result.ordersCreated,
        updated: result.ordersUpdated,
        unit: 'NAP Orange orders',
        status: rows.rejected.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
      },
      rows: {
        received: rows.received,
        rejected: rows.rejected.length,
        created: rows.createdRows,
        updated: rows.updatedRows,
        deleted: rows.deletedRows,
        identical: rows.identicalRows,
      },
      warnings: rows.rejected,
    }
  } catch (error) {
    await logNapOrangeUploadError({ error, reportId: newReport.id })

    const { code } = error

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - NAP Orange end')
  }
}

export async function importSobeysSales(ctx) {
  console.log('[REPORT] - Sobeys start')
  const reportStart = moment().format()
  const fileName = ctx.request.header['content-disposition'].replace('filename=', 'ADMIN_')
  const file = ctx.req

  const newReport = await Report.query().insert({
    type: REPORTS.sobeys,
    reportStart,
    fileName,
    notifSent: false,
  })

  const fileContent = await new Response(file).blob()

  try {
    const { result, rows } = await createSobeysData({
      fileContent: fileContent.stream(),
    })

    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.sobeys })
    await updateSobeysReport({ fileName, reportId: newReport.id, rows })

    ctx.body = {
      result: {
        created: result.ordersCreated,
        updated: result.ordersUpdated,
        unit: 'Sobeys orders',
        status: rows.rejected.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
      },
      rows: {
        received: rows.received,
        rejected: rows.rejected.length,
        created: rows.createdRows,
        updated: rows.updatedRows,
        deleted: rows.deletedRows,
        identical: rows.identicalRows,
      },
      warnings: rows.rejected,
    }
  } catch (error) {
    await logSobeysUploadError({ error, reportId: newReport.id })

    const { code } = error

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Sobeys end')
  }
}

async function logNapOrangeUploadError({ error, reportId }) {
  console.log('[REPORT] - NAP Orange error: ', error)

  await Report.query()
    .update({
      failure: error.message,
      reportEnd: moment().format(),
      notifSent: true,
    })
    .where('id', reportId)

  await sendSlackNotification({ error, context: SLACK_CONTEXT.napOrange, sentByAdmin: true })
}

async function logSobeysUploadError({ error, reportId }) {
  console.log('[REPORT] - Sobeys error: ', error)

  await Report.query()
    .update({
      failure: error.message,
      reportEnd: moment().format(),
      notifSent: true,
    })
    .where('id', reportId)

  await sendSlackNotification({ error, context: SLACK_CONTEXT.sobeys, sentByAdmin: true })
}

export async function importLoblawsSales(ctx) {
  console.log('[REPORT] - Loblaws start')
  const reportStart = moment().format()
  const fileName = ctx.request.header['content-disposition'].replace('filename=', 'ADMIN_')
  const file = ctx.req

  const newReport = await Report.query().insert({
    type: REPORTS.loblaws,
    reportStart,
    fileName,
    notifSent: false,
  })

  // /*
  //  * Create the blob and call the .stream() when you need to use it.
  //  * S3 closes the stream once done with it. So it will work locally
  //  * if you do not save it, but will crash after you saved it...
  //  */
  const fileContent = await new Response(file).text()
  // console.log(fileContent)

  let savedS3Name
  // console.log(config.amazonS3.buckets.global.name)
  try {
    const s3FileName = `temp-loblaws-${new Date().getTime()}` /* await addFileToS3({
      fileName,
      fileContent: fileContent.stream(),
      bucket: { ...config.amazonS3.buckets.global, name: config.amazonS3.buckets.global.name.concat('/loblaws') },
    })
    savedS3Name = s3FileName
    */

    const { result, rows, dataImportId } = await createLoblawsData({
      fileName,
      fileContent,
      s3FileName,
      reportId: newReport.id,
    })

    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.loblaws })
    await updateLoblawsReport({ fileName: savedS3Name ?? fileName, reportId: newReport.id, rows, dataImportId })

    ctx.body = {
      result: {
        created: result.ordersCreated,
        updated: result.ordersUpdated,
        unit: 'Loblaws orders',
        status: rows.rejectedRows.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
      },
      rows: {
        received: rows.received,
        rejected: rows.rejectedRows.length,
        created: rows.createdRows,
        updated: rows.updatedRows,
        deleted: rows.deletedRows,
        identical: rows.identicalRows,
      },
      warnings: rows.rejectedRows,
    }
  } catch (error) {
    await logLoblawsError({ error, reportId: newReport.id })

    const { code } = error

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Loblaws end')
  }
}

async function addFileToS3({ bucket, fileName, fileContent }) {
  if (process.env.NODE_ENV !== 'development') {
    const nameInS3 = await uploadFileToS3({ bucket, file: { name: fileName, content: fileContent } })
    return nameInS3
  }
}

async function logCircleKUploadError({ error, isAdmin, reportId }) {
  console.log('[REPORT] - Circle K error: ', error)

  await Report.query()
    .update({
      failure: error.message,
      reportEnd: moment().format(),
      notifSent: true,
    })
    .where('id', reportId)

  await sendSlackNotification({ error, context: SLACK_CONTEXT.circleK, sentByAdmin: isAdmin })
}

async function logCentralMarketUploadError({ error, reportId }) {
  console.log('[REPORT] - Central Market error: ', error)

  await Report.query()
    .update({
      failure: error.message,
      reportEnd: moment().format(),
      notifSent: true,
    })
    .where('id', reportId)

  await sendSlackNotification({ error, context: SLACK_CONTEXT.centralMarket, sentByAdmin: true })
}

async function logLoblawsError({ error, reportId }) {
  console.log('[REPORT] - Loblaws error: ', error)

  await Report.query()
    .update({
      failure: error.message,
      reportEnd: moment().format(),
      notifSent: true,
    })
    .where('id', reportId)

  await sendSlackNotification({ error, context: SLACK_CONTEXT.loblaws, sentByAdmin: true })
}

export async function importParklandSales(ctx) {
  console.log('[REPORT] - Parkland start')
  const reportStart = moment().format()
  const fileName = ctx.request.header['content-disposition'].replace('filename=', 'ADMIN_')
  const file = ctx.req

  const newReport = await Report.query().insert({
    type: REPORTS.parkland,
    reportStart,
    fileName,
    notifSent: false,
  })

  /*
   * Create the blob and call the .stream() when you need to use it.
   * S3 closes the stream once done with it. So it will work locally
   * if you do not save it, but will crash after you saved it...
   */
  const fileContent = await new Response(file).blob()

  let savedS3Name

  try {
    const s3FileName = `parkland-temp_${new Date().getMilliseconds()}` /* await addFileToS3({
      fileName,
      fileContent: fileContent.stream(),
      bucket: config.amazonS3.buckets.parkland,
    }) */
    savedS3Name = s3FileName

    const { result, rows, reportIds } = await createParklandData({
      fileName,
      fileContent: fileContent.stream(),
      s3FileName,
    })

    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.parkland })
    await updateParklandReport({ fileName: savedS3Name ?? fileName, reportId: newReport.id, rows })

    ctx.body = {
      result: {
        created: result.ordersCreated,
        updated: result.ordersUpdated,
        unit: 'Parkland orders',
        status: rows.rejected.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
      },
      rows: {
        received: rows.received,
        rejected: rows.rejected.length,
        created: rows.createdRows,
        updated: rows.updatedRows,
        deleted: rows.deletedRows,
        identical: rows.identicalRows,
      },
      warnings: rows.rejected,
    }
  } catch (error) {
    await logParklandUploadError({ error, reportId: newReport.id })

    const { code } = error

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Parkland end')
  }
}

async function logParklandUploadError({ error, reportId }) {
  console.log('[REPORT] - Parkland error: ', error)

  await Report.query()
    .update({
      failure: error.message,
      reportEnd: moment().format(),
      notifSent: true,
    })
    .where('id', reportId)

  await sendSlackNotification({ error, context: SLACK_CONTEXT.parkland, sentByAdmin: true })
}

export async function importPetroCanadaSales(ctx) {
  console.log('[REPORT] - Petro Canada start')
  const reportStart = moment().format()
  const fileName = ctx.request.header['content-disposition'].replace('filename=', 'ADMIN_')
  const file = ctx.req

  const newReport = await Report.query().insert({
    type: REPORTS.petroCanada,
    reportStart,
    fileName,
    notifSent: false,
  })

  /*
   * Create the blob and call the .stream() when you need to use it.
   * S3 closes the stream once done with it. So it will work locally
   * if you do not save it, but will crash after you saved it...
   */
  const fileContent = await new Response(file).blob()

  let savedS3Name

  try {
    const s3FileName = `petro-canada-temp_${new Date().getMilliseconds()}` /* await addFileToS3({
      fileName,
      fileContent: fileContent.stream(),
      bucket: config.amazonS3.buckets.petroCanada,
    }) */
    savedS3Name = s3FileName

    const { result, rows, reportIds } = await createPetroCanadaData({
      fileName,
      fileContent: fileContent.stream(),
      s3FileName,
    })

    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.petroCanada })
    await updatePetroCanadaReport({ fileName: savedS3Name ?? fileName, reportId: newReport.id, rows })

    ctx.body = {
      result: {
        created: result.ordersCreated,
        updated: result.ordersUpdated,
        unit: 'Petro Canada orders',
        status: rows.rejected.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
      },
      rows: {
        received: rows.received,
        rejected: rows.rejected.length,
        created: rows.createdRows,
        updated: rows.updatedRows,
        deleted: rows.deletedRows,
        identical: rows.identicalRows,
      },
      warnings: rows.rejected,
    }
  } catch (error) {
    await logPetroCanadaUploadError({ error, reportId: newReport.id })

    const { code } = error

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - Petro Canada end')
  }
}

async function logPetroCanadaUploadError({ error, reportId }) {
  console.log('[REPORT] - Petro Canada error: ', error)

  await Report.query()
    .update({
      failure: error.message,
      reportEnd: moment().format(),
      notifSent: true,
    })
    .where('id', reportId)

  await sendSlackNotification({ error, context: SLACK_CONTEXT.petroCanada, sentByAdmin: true })
}

export async function importLatestRabbaData({ containerName }) {
  const reportStart = moment().format()

  const sftp = new SFTP()
  const latestRabbaFileInSFTP = await sftp.getLatestBlob({ containerName })
  const fileContent = await sftp.getBlobContent({ containerName, blobName: latestRabbaFileInSFTP.name })

  const fileWasCorrectlyImported = await Report.query()
    .select()
    .where('type', REPORTS.rabba)
    .andWhere('file_name', latestRabbaFileInSFTP.name)
    .andWhere('notif_sent', true)
    .orderBy('created_at', 'desc')
    .first()

  if (fileWasCorrectlyImported) {
    return
  }

  console.log('[REPORT] - New Rabba file in SFTP server')

  const newReport = await Report.query().insert({
    fileName: latestRabbaFileInSFTP.name,
    type: REPORTS.rabba,
    reportStart,
    notifSent: false,
  })

  try {
    const res = await createRabbaData({ fileContent })
    await updateRabbaReport({ fileName: latestRabbaFileInSFTP.name, reportId: newReport.id, res })

    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.rabbaWorker })
    console.log('[REPORT] - Rabba Success')
  } catch (error) {
    await logRabbaUploadError({ error, isAdmin: false, reportId: newReport.id })
  }
  console.log('[REPORT] - Rabba SFTP end')
}

export async function import7ElevenSales(ctx) {
  console.log('[REPORT] - 7Eleven start')
  const reportStart = moment().format()
  const fileName = ctx.request.header['content-disposition'].replace('filename=', 'ADMIN_')
  const file = ctx.req

  const newReport = await Report.query().insert({
    type: REPORTS.sevenEleven,
    reportStart,
    fileName,
    notifSent: false,
  })

  /*
   * Create the blob and call the .stream() when you need to use it.
   * S3 closes the stream once done with it. So it will work locally
   * if you do not save it, but will crash after you saved it...
   */
  const fileContent = await new Response(file).blob()

  let savedS3Name

  try {
    const s3FileName = `7-eleven-temp_${new Date().getMilliseconds()}` /* await addFileToS3({
      fileName,
      fileContent: fileContent.stream(),
      bucket: config.amazonS3.buckets.petroCanada,
    }) */
    savedS3Name = s3FileName

    const { result, rows, reportIds } = await create7ElevenData({
      fileName,
      fileContent: fileContent.stream(),
      s3FileName,
    })

    await sendSlackNotification({ success: true, context: SLACK_CONTEXT.sevenEleven })
    await update7ElevenReport({ fileName: savedS3Name ?? fileName, reportId: newReport.id, rows })

    ctx.body = {
      result: {
        created: result.ordersCreated,
        updated: result.ordersUpdated,
        unit: '7 Eleven orders',
        status: rows.rejected.length ? UPLOAD_RESULT_STATES.withError : UPLOAD_RESULT_STATES.success,
      },
      rows: {
        received: rows.received,
        rejected: rows.rejected.length,
        created: rows.createdRows,
        updated: rows.updatedRows,
        deleted: rows.deletedRows,
        identical: rows.identicalRows,
      },
      warnings: rows.rejected,
    }
  } catch (error) {
    await log7ElevenUploadError({ error, reportId: newReport.id })

    const { code } = error

    return ctx.throw(code ?? 400, error)
  } finally {
    console.log('[REPORT] - 7Eleven end')
  }
}

async function log7ElevenUploadError({ error, reportId }) {
  console.log('[REPORT] - 7 Eleven error: ', error)

  await Report.query()
    .update({
      failure: error.message,
      reportEnd: moment().format(),
      notifSent: true,
    })
    .where('id', reportId)

  await sendSlackNotification({ error, context: SLACK_CONTEXT.sevenEleven, sentByAdmin: true })
}
