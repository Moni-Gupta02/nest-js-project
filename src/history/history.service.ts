import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HistoryDocument } from './Schemas/history.schema';

@Injectable()
export class HistoryService {
  constructor(
    @InjectModel('History')
    private readonly historyModel: Model<HistoryDocument>,
  ) {}

  // async createHistory(
  //   user_id: string,
  //   model_name: string,
  //   action: string,
  //   before_changes: Record<string, any> | null,
  //   current_changes: Record<string, any>,
  // ): Promise<HistoryDocument> {
  //   const history = new this.historyModel({
  //     user_id,
  //     model_name,
  //     action,
  //     before_changes,
  //     current_changes,
  //   });
  //   return history.save();
  // }

  /**
   * Normalize a value for comparison so Date/ObjectId/NaN etc. don't cause false diffs.
   */
  private normalizeForCompare(value: any): any {
    if (value == null) return value;
    if (typeof value === 'number' && Number.isNaN(value)) return '__NaN__';
    if (value && typeof value === 'object') {
      if ('$oid' in value) return String(value.$oid);
      if ('$numberDouble' in value) {
        const n = parseFloat(value.$numberDouble);
        return Number.isNaN(n) ? '__NaN__' : n;
      }
      if ('$date' in value) return new Date(value.$date).toISOString();
    }
    const ctorName = value?.constructor?.name;
    if (ctorName === 'ObjectID' || ctorName === 'ObjectId') {
      return value.toString();
    }
    if (value instanceof Date) return value.toISOString();
    return value;
  }

  async getChangedFields(
    previousChange: any,
    currentChange: any,
  ): Promise<{
    current_changes: Record<string, any>;
    before_changes: Record<string, any>;
  }> {
    try {
      if (previousChange == null && currentChange == null) {
        return { before_changes: {}, current_changes: {} };
      }
      const beforeChanges: Record<string, any> = {};
      const currentChanges: Record<string, any> = {};

      const parseMongoTypes = (value: any): any => {
        if (value && typeof value === 'object') {
          if ('$oid' in value) return value.$oid;
          if ('$numberDouble' in value) return parseFloat(value.$numberDouble);
          if ('$date' in value) return value.$date;
        }
        return value;
      };

      const toPlain = (val: any) => {
        if (val == null || typeof val !== 'object') return val;
        try {
          if (typeof val.toObject === 'function') return val.toObject();
        } catch {
          // circular ref or other; use as-is
        }
        return val;
      };

      const prevObj = toPlain(previousChange);
      const currObj = toPlain(currentChange);

      const isComplex = (val: any) =>
        val !== null &&
        typeof val === 'object' &&
        !(val instanceof Date) &&
        !Array.isArray(val);

      const skipKeys = new Set(['_id', '__v', 'updatedAt', 'createdAt']);

      const idFromItem = (item: any, key: string): string | null => {
        if (!item || typeof item !== 'object' || Array.isArray(item))
          return null;
        try {
          const v = item[key];
          if (v == null) return null;
          if (typeof v === 'object' && v !== null && '$oid' in v)
            return String(v.$oid);
          return String(v);
        } catch {
          return null;
        }
      };

      const arrayMatchKey = (arr: any[], key: string): boolean => {
        if (!Array.isArray(arr) || arr.length === 0) return false;
        const ids = new Set<string>();
        for (const item of arr) {
          const id = idFromItem(item, key);
          if (id == null) return false;
          ids.add(id);
        }
        return ids.size === arr.length;
      };

      const MAX_DEPTH = 50;
      const checkChanges = (
        prev: any,
        curr: any,
        path: string = '',
        depth: number = 0,
      ) => {
        if (depth > MAX_DEPTH) return;
        const p = parseMongoTypes(prev);
        const c = parseMongoTypes(curr);

        if (Array.isArray(p) || Array.isArray(c)) {
          const pArr = Array.isArray(p) ? p : [];
          const cArr = Array.isArray(c) ? c : [];
          const matchKeys = ['component_id', '_id', 'id'];
          let matched: { id: string; pItem: any; cItem: any }[] = [];
          let useKeyMatch = false;
          for (const key of matchKeys) {
            if (arrayMatchKey(pArr, key) && arrayMatchKey(cArr, key)) {
              const pMap = new Map<string, any>();
              const cMap = new Map<string, any>();
              pArr.forEach((item: any) => {
                const id = idFromItem(item, key);
                if (id != null) pMap.set(id, item);
              });
              cArr.forEach((item: any) => {
                const id = idFromItem(item, key);
                if (id != null) cMap.set(id, item);
              });
              const allIds = new Set([...pMap.keys(), ...cMap.keys()]);
              matched = [...allIds].map((id) => ({
                id,
                pItem: pMap.get(id),
                cItem: cMap.get(id),
              }));
              useKeyMatch = true;
              break;
            }
          }
          if (useKeyMatch && matched.length > 0) {
            for (const { id, pItem, cItem } of matched) {
              const fullPath = path ? `${path}.${id}` : id;
              checkChanges(pItem, cItem, fullPath, depth + 1);
            }
          } else {
            const maxLen = Math.max(pArr.length, cArr.length);
            for (let i = 0; i < maxLen; i++) {
              const fullPath = path ? `${path}.${i}` : String(i);
              checkChanges(pArr[i], cArr[i], fullPath, depth + 1);
            }
          }
        } else if (isComplex(p) || isComplex(c)) {
          const allKeys = new Set([
            ...Object.keys(p || {}),
            ...Object.keys(c || {}),
          ]);

          allKeys.forEach((key) => {
            if (skipKeys.has(key)) return;
            const fullPath = path ? `${path}.${key}` : key;
            checkChanges(
              p ? p[key] : undefined,
              c ? c[key] : undefined,
              fullPath,
              depth + 1,
            );
          });
        } else {
          // Primitive (or plain value): compare normalized so Date/ObjectId/NaN match when equal
          const pNorm = this.normalizeForCompare(p);
          const cNorm = this.normalizeForCompare(c);
          const same = pNorm === cNorm;
          if (!same) {
            if (
              (p === null || p === undefined || p === '') &&
              (c === null || c === undefined || c === '')
            ) {
              return;
            }
            if (p !== undefined) beforeChanges[path] = p;
            if (c !== undefined) currentChanges[path] = c;
          }
        }
      };

      checkChanges(prevObj, currObj, '', 0);

      return { before_changes: beforeChanges, current_changes: currentChanges };
    } catch (e) {
      console.log('Error in getChangedFields:', e);
      return { before_changes: {}, current_changes: {} };
    }
  }

  //*******************new  history create function************************ */
  async createHistory(
    type = 'Anonymous',
    user: any,
    entity_id: string,
    beforeChange = {},
    afterChange = {},
    changeDetails: any = {},
  ) {
    try {
      const isCreate =
        !beforeChange ||
        (typeof beforeChange === 'object' &&
          Object.keys(beforeChange).length === 0);
      const isCreateAction =
        isCreate &&
        (changeDetails?.action === 'created' ||
          changeDetails?.action === 'HISTORY_CREATED' ||
          String(changeDetails?.action || '')
            .toLowerCase()
            .includes('create'));

      // For create: don't store full document, only that it was created (no before/after diff)
      let before_changes: Record<string, any> = {};
      let current_changes: Record<string, any> = {};

      if (isCreateAction) {
        before_changes = {};
        current_changes = {};
      } else {
        const diff = await this.getChangedFields(beforeChange, afterChange);
        before_changes = diff.before_changes;
        current_changes = diff.current_changes;
      }

      // Only persist when there are actual changes, or for create (record the event)
      const hasChanges = Object.keys(current_changes).length > 0;
      const shouldPersist = hasChanges || isCreateAction;

      if (shouldPersist) {
        await this.historyModel.create({
          platform: 'rms',
          type: type,
          entity_id: entity_id,
          before_change: before_changes,
          after_change: current_changes,
          changed_by: {
            name: changeDetails?.login_details
              ? 'LOGIN_ATTEMPTED'
              : user?.name || 'Unknown',
            email: user?.email || '',
          },
          change_details: changeDetails,
        });
        return 'History Created!';
      }
      return undefined;
    } catch (err) {
      console.log('Error creating history:', err);
      return undefined;
    }
  }

  // Function to deeply compare before and after objects and get only updated fields
  // private getUpdatedFields(before: any, after: any): any {
  //   const changes = {};

  //   function deepDiff(beforeObj: any, afterObj: any, path: string[] = []) {
  //     for (const key in afterObj) {
  //       const currentPath = [...path, key];
  //       const beforeValue = beforeObj ? beforeObj[key] : undefined;
  //       const afterValue = afterObj[key];

  //       if (
  //         typeof afterValue === 'object' &&
  //         !Array.isArray(afterValue) &&
  //         afterValue !== null
  //       ) {
  //         deepDiff(beforeValue, afterValue, currentPath);
  //       } else if (beforeValue !== afterValue) {
  //         changes[currentPath.join('.')] = {
  //           before: beforeValue,
  //           after: afterValue,
  //         };
  //       }
  //     }
  //   }

  //   deepDiff(before, after);
  //   return changes;
  // }
  private getUpdatedFields(before: any, after: any): any {
    const changes = {};

    function parseMongoTypes(value: any): any {
      if (value && typeof value === 'object') {
        if ('$oid' in value) return value.$oid;
        if ('$numberDouble' in value) return parseFloat(value.$numberDouble);
        if ('$date' in value) return new Date(value.$date);
      }
      return value;
    }

    function isBothNullOrNaN(beforeValue: any, afterValue: any): boolean {
      const isBeforeInvalid =
        beforeValue === null ||
        beforeValue === undefined ||
        afterValue === 0 ||
        Number.isNaN(beforeValue);
      const isAfterInvalid =
        afterValue === null ||
        afterValue === undefined ||
        Number.isNaN(afterValue) ||
        afterValue === 0;
      return isBeforeInvalid && isAfterInvalid;
    }

    function deepDiff(beforeObj: any, afterObj: any, path: string[] = []) {
      for (const key in afterObj) {
        const currentPath = [...path, key];
        const beforeValue = beforeObj
          ? parseMongoTypes(beforeObj[key])
          : undefined;
        const afterValue = parseMongoTypes(afterObj[key]);

        // Skip if both 'before' and 'after' are null, undefined, or NaN
        if (isBothNullOrNaN(beforeValue, afterValue)) continue;

        // Add changes where 'before' is null/undefined but 'after' has a value
        // if (
        //   (beforeValue === null || beforeValue === undefined) &&
        //   afterValue !== undefined
        // ) {
        //   changes[currentPath.join('.')] = {
        //     before: beforeValue,
        //     after: afterValue,
        //   };
        //   continue;
        // }

        // Handle primitive values (string, number, boolean, null)
        if (typeof afterValue !== 'object' || afterValue === null) {
          if (beforeValue !== afterValue) {
            changes[currentPath.join('.')] = {
              before: beforeValue,
              after: afterValue,
            };
          }
        } else if (Array.isArray(afterValue)) {
          // Handle array comparison
          if (
            !Array.isArray(beforeValue) ||
            JSON.stringify(beforeValue) !== JSON.stringify(afterValue)
          ) {
            changes[currentPath.join('.')] = {
              before: beforeValue,
              after: afterValue,
            };
          }
        } else {
          // Handle nested objects recursively
          deepDiff(beforeValue, afterValue, currentPath);
        }
      }
    }

    // Start comparing the objects
    deepDiff(before, after);
    return changes;
  }

  async listHistory(type: string): Promise<HistoryDocument | any> {
    const history = await this.historyModel
      .find({ type: type })
      .sort({ createdAt: -1 }) // Sort by createdAt field in descending order
      .exec();
    return history;
  }
  async getLastUpdated(entityId: string) {
    const lastUpdate = await this.historyModel
      .findOne({ entity_id: entityId })
      .sort({ createdAt: -1 }) // Get the most recent update
      .select('type updatedAt before_change after_change changed_by');

    if (!lastUpdate) return null;
    return {
      user: lastUpdate.changed_by, // User details
      updatedAt: lastUpdate.updatedAt, // Timestamp
      before_changes: lastUpdate.before_change,
      after_changes: lastUpdate.after_change,
      type: lastUpdate.type, // Model type (e.g., User, Order)
    };
  }
}
