import {describe,it,expect} from 'vitest';
import {convertArea,formatArea,parseArea} from './AreaInput';
describe('area values',()=>{
 it('groups thousands and retains fractional digits for each language',()=>{expect(formatArea('10000','en')).toBe('10,000');expect(formatArea('10000.25','vi')).toBe('10.000,25');expect(formatArea('10000.25','zh')).toBe('10,000.25');expect(formatArea('1.','en')).toBe('1.')});
 it('parses grouped pastes without storing separators',()=>{expect(parseArea('10,000.25','en')).toBe('10000.25');expect(parseArea('10.000,25','vi')).toBe('10000.25');expect(parseArea('10 000','zh')).toBe('10000');expect(parseArea('-1','en')).toBeNull();expect(parseArea('abc','vi')).toBeNull()});
 it('converts both integer and fractional areas without changing their physical size',()=>{expect(convertArea('10000','m2','ha')).toBe('1');expect(convertArea('1.25','ha','m2')).toBe('12500');expect(convertArea('0.125','km2','ha')).toBe('12.5');expect(convertArea('','m2','ha')).toBe('');expect(convertArea(convertArea('12345.67','m2','ha'),'ha','m2')).toBe('12345.67')});
});
