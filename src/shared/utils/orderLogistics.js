/** 系统模拟器有明确来源标记；保留真实承运商和运单，不把模拟值改名为真实物流。 */
export function isSimulatedShipment(row = {}) {
  const read = key => String(row[key] ?? row[key[0].toUpperCase() + key.slice(1)] ?? '').trim()
  return read('carrierCode').toUpperCase() === 'SIM'
    || read('carrierName') === '模拟物流'
    || /^SIM-WMS-/i.test(read('sourceEventId'))
    || /^SIM[0-9a-f]{24}$/i.test(read('trackingNo'))
}

/** 兼容两种JSON命名，清除历史模拟发货的客户展示，不改订单和履约事实。 */
export function customerShipments(value) {
  if (!Array.isArray(value)) return []
  return value.filter(row => row && !isSimulatedShipment(row)).map(row => ({
    ...row,
    shipmentId: row.shipmentId ?? row.ShipmentId,
    shipmentNo: row.shipmentNo ?? row.ShipmentNo ?? '',
    carrierName: row.carrierName ?? row.CarrierName ?? '',
    trackingNo: row.trackingNo ?? row.TrackingNo ?? '',
  }))
}
