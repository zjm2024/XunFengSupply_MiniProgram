/** 为旧回归夹具提供可控制的确认结果；仅测试调用此桥接，不引入生产原生弹框。 */
export function dialogHarness() {
  return {
    openAppDialog: options => new Promise(resolve => {
      uni.showModal({ ...options, content: options.description ?? options.content,
        success: result => resolve(Boolean(result.confirm)), fail: () => resolve(false) })
    }),
  }
}
