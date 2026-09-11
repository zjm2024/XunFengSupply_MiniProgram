import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('Address API', () => {
  it('归一化地址列表并保留完整联系方式', async () => {
    const dispatchMock = vi.fn().mockResolvedValue([
      {
        AddressId: 12,
        ContactName: '张三',
        ContactPhone: '13800138000',
        Province: '广东省',
        City: '广州市',
        District: '天河区',
        AddressDetail: '体育西路 1 号',
        IsDefault: true,
      },
    ])
    vi.doMock('@/shared/api/dispatchClient.js', () => ({ dispatch: dispatchMock }))

    const { getAddressList } = await import('@/subPackages/account/api/addressApi.js')
    const result = await getAddressList()

    expect(result).toEqual([
      expect.objectContaining({
        id: 12,
        name: '张三',
        phone: '13800138000',
        fullAddress: '广东省广州市天河区体育西路 1 号',
        isDefault: true,
      }),
    ])
  })

  it('新增地址使用后端 PascalCase 契约', async () => {
    const dispatchMock = vi.fn().mockResolvedValue(21)
    vi.doMock('@/shared/api/dispatchClient.js', () => ({ dispatch: dispatchMock }))

    const { createAddress } = await import('@/subPackages/account/api/addressApi.js')
    await createAddress({
      name: '李四',
      phone: '13900139000',
      province: '浙江省',
      city: '杭州市',
      district: '西湖区',
      detail: '文三路 8 号',
      isDefault: true,
    })

    expect(dispatchMock).toHaveBeenCalledWith(
      'MallOrder',
      'Mini.AddressController',
      'CreateAddress',
      {
        ContactName: '李四',
        ContactPhone: '13900139000',
        Province: '浙江省',
        City: '杭州市',
        District: '西湖区',
        AddressDetail: '文三路 8 号',
        IsDefault: true,
      },
    )
  })
})
