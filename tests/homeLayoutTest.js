import {describe,it,expect} from 'vitest'
import {quickEntryColumns} from '@/shared/utils/homeLayout.js'

describe('首页快捷入口自适应平铺',()=>{
 it.each([[1,1],[2,2],[3,3],[4,4],[5,3],[6,3],[7,4],[8,4],[9,3],[10,4],[11,4],[12,4]])('%i个入口在手机上均衡分行', (count,columns)=>{expect(quickEntryColumns(count,4)).toBe(columns)})
 it('平板可一行显示五到六项，多行数量保持均衡',()=>{expect(quickEntryColumns(5,6)).toBe(5);expect(quickEntryColumns(6,6)).toBe(6);expect(quickEntryColumns(7,6)).toBe(4);expect(quickEntryColumns(12,6)).toBe(6)})
 it('空内容和错误数量保持安全列数',()=>{expect(quickEntryColumns(0)).toBe(1);expect(quickEntryColumns(null)).toBe(1);expect(quickEntryColumns(3,0)).toBe(3)})
})
