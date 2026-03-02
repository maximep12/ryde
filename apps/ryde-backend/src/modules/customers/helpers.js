import uniqWith from 'lodash/uniqWith'

import CustomerTerritory from 'models/customerTerritory'
import DistrictRegion from 'models/districtRegion'
import Territory from 'models/territory'
import TerritoryDistrict from 'models/territoryDistrict'

export async function linkDistrictRegions({ locations }) {
  const regionDistricts = uniqWith(locations, (a, b) => a.region === b.region && a.district === b.district).map(
    (r) => ({ regionId: r.region, districtId: r.district }),
  )

  const allRegionDistricts = await DistrictRegion.query().select()

  const regionDistrictsToCreate = regionDistricts.filter(
    (rd) => !allRegionDistricts.find((ard) => ard.districtId === rd.districtId && ard.regionId === rd.regionId),
  )

  const regionDistrictsToDelete = allRegionDistricts.filter(
    (ard) => !regionDistricts.find((rd) => rd.districtId === ard.districtId && rd.regionId === ard.regionId),
  )

  if (regionDistrictsToCreate.length) {
    await DistrictRegion.query().insert(regionDistrictsToCreate)
  }

  if (regionDistrictsToDelete.length) {
    for (const rd of regionDistrictsToDelete) {
      await DistrictRegion.query().delete().where('region_id', rd.regionId).andWhere('district_id', rd.districtId)
    }
  }

  return { created: regionDistrictsToCreate.length, deleted: regionDistrictsToDelete.length }
}

export async function linkTerritoryDistricts({ locations }) {
  const territoryDistricts = uniqWith(
    locations,
    (a, b) => a.territory === b.territory && a.district === b.district,
  ).map((r) => ({ territoryId: r.territory, districtId: r.district }))

  const allTerritoryDistricts = await TerritoryDistrict.query().select()

  const territoryDistrictsToCreate = territoryDistricts.filter(
    (rd) =>
      !allTerritoryDistricts.find((ard) => ard.districtId === rd.districtId && ard.territoryId === rd.territoryId),
  )

  const territoryDistrictsToDelete = allTerritoryDistricts.filter(
    (ard) => !territoryDistricts.find((rd) => rd.districtId === ard.districtId && rd.territoryId === ard.territoryId),
  )

  if (territoryDistrictsToCreate.length) {
    await TerritoryDistrict.query().insert(territoryDistrictsToCreate)
  }

  if (territoryDistrictsToDelete.length) {
    for (const rd of territoryDistrictsToDelete) {
      await TerritoryDistrict.query()
        .delete()
        .where('territory_id', rd.territoryId)
        .andWhere('district_id', rd.districtId)
    }
  }

  return { created: territoryDistrictsToCreate.length, deleted: territoryDistrictsToDelete.length }
}

export async function linkCustomerTerritories({ locations }) {
  const customerTerritories = uniqWith(
    locations,
    (a, b) => a.territory === b.territory && a.customer === b.customer,
  ).map((r) => ({ territoryId: r.territory, customerId: r.customer }))

  // KEEP THE NOT ASSIGNED CUSTOMERS LINKED FOR NOW
  const notAssignedTerritory = await Territory.query().select().where('name', 'Not Assigned').first()
  const allCustomerTerritories = await CustomerTerritory.query()
    .select()
    .whereNot('territory_id', notAssignedTerritory.id)

  const customerTerritoriesToCreate = customerTerritories.filter(
    (rd) =>
      !allCustomerTerritories.find((ard) => ard.customerId === rd.customerId && ard.territoryId === rd.territoryId),
  )

  const customerTerritoriesToDelete = allCustomerTerritories.filter(
    (ard) => !customerTerritories.find((rd) => rd.customerId === ard.customerId && rd.territoryId === ard.territoryId),
  )

  if (customerTerritoriesToCreate.length) {
    await CustomerTerritory.query().insert(customerTerritoriesToCreate)
  }

  if (customerTerritoriesToDelete.length) {
    for (const ct of customerTerritoriesToDelete) {
      await CustomerTerritory.query()
        .delete()
        .where('territory_id', ct.territoryId)
        .andWhere('customer_id', ct.customerId)
    }
  }

  return { created: customerTerritoriesToCreate.length, deleted: customerTerritoriesToDelete.length }
}

export async function linkNotAssignedCustomers({ locations }) {
  const notAssignedTerritory = await Territory.query().select().where('name', 'Not Assigned').first()
  const allNotAssignedCustomers = await CustomerTerritory.query()
    .select()
    .where('territory_id', notAssignedTerritory.id)

  const notAssignedCustomersToCreate = locations.filter(
    (location) =>
      !allNotAssignedCustomers.find(
        (nac) => nac.customerId === location.customer && nac.territoryId === location.territory,
      ),
  )

  const notAssignedCustomersToDelete = allNotAssignedCustomers.filter(
    (ard) =>
      !locations.find((location) => location.customer === ard.customerId && location.territory === ard.territoryId),
  )

  if (notAssignedCustomersToCreate.length) {
    await CustomerTerritory.query().insert(
      notAssignedCustomersToCreate.map((nac) => ({ customerId: nac.customer, territoryId: nac.territory })),
    )
  }

  if (notAssignedCustomersToDelete.length) {
    for (const toDelete of notAssignedCustomersToDelete) {
      await CustomerTerritory.query()
        .delete()
        .where('territory_id', toDelete.territoryId)
        .andWhere('customer_id', toDelete.customerId)
    }
  }

  return { created: notAssignedCustomersToCreate.length, deleted: notAssignedCustomersToDelete.length }
}
