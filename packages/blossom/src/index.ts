// Port of https://github.com/mattkrick/EdmondsBlossom (MIT). Notice in LICENSE.
type Edge = [number, number, number];

const filledArray = <T>(len: number, fill: T): T[] => {
  const arr: T[] = [];
  for (let i = 0; i < len; i++) {
    arr[i] = fill;
  }
  return arr;
};

const initArrArr = (len: number): number[][] => {
  const arr: number[][] = [];
  for (let i = 0; i < len; i++) {
    arr[i] = [];
  }
  return arr;
};

const getMin = (arr: number[], start: number, end: number): number => {
  let min = Number.POSITIVE_INFINITY;
  for (let i = start; i <= end; i++) {
    if (arr[i] < min) {
      min = arr[i];
    }
  }
  return min;
};

const pIndex = <T>(arr: T[], idx: number): T => (idx < 0 ? arr[arr.length + idx] : arr[idx]);

class Edmonds {
  private edges: Edge[];
  private maxCardinality: boolean;
  private nEdge: number;
  private nVertex = 0;
  private maxWeight = 0;
  private endpoint: number[] = [];
  private neighbend: number[][] = [];
  private mate: number[] = [];
  private label: number[] = [];
  private labelEnd: number[] = [];
  private inBlossom: number[] = [];
  private blossomParent: number[] = [];
  private blossomChilds: number[][] = [];
  private blossomBase: number[] = [];
  private blossomEndPs: number[][] = [];
  private bestEdge: number[] = [];
  private blossomBestEdges: number[][] = [];
  private unusedBlossoms: number[] = [];
  private dualVar: number[] = [];
  private allowEdge: boolean[] = [];
  private queue: number[] = [];

  constructor(edges: Edge[], maxCardinality: boolean) {
    this.edges = edges;
    this.maxCardinality = maxCardinality;
    this.nEdge = edges.length;
    this.init();
  }

  maxWeightMatching(): number[] {
    for (let t = 0; t < this.nVertex; t++) {
      this.label = filledArray(2 * this.nVertex, 0);
      this.bestEdge = filledArray(2 * this.nVertex, -1);
      this.blossomBestEdges = initArrArr(2 * this.nVertex);
      this.allowEdge = filledArray(this.nEdge, false);
      this.queue = [];
      for (let v = 0; v < this.nVertex; v++) {
        if (this.mate[v] === -1 && this.label[this.inBlossom[v]] === 0) {
          this.assignLabel(v, 1, -1);
        }
      }
      let augmented = false;
      while (true) {
        while (this.queue.length > 0 && !augmented) {
          const v = this.queue.pop()!;
          for (let ii = 0; ii < this.neighbend[v].length; ii++) {
            const p = this.neighbend[v][ii];
            const k = ~~(p / 2);
            const w = this.endpoint[p];
            if (this.inBlossom[v] === this.inBlossom[w]) continue;
            let kSlack = 0;
            if (!this.allowEdge[k]) {
              kSlack = this.slack(k);
              if (kSlack <= 0) {
                this.allowEdge[k] = true;
              }
            }
            if (this.allowEdge[k]) {
              if (this.label[this.inBlossom[w]] === 0) {
                this.assignLabel(w, 2, p ^ 1);
              } else if (this.label[this.inBlossom[w]] === 1) {
                const base = this.scanBlossom(v, w);
                if (base >= 0) {
                  this.addBlossom(base, k);
                } else {
                  this.augmentMatching(k);
                  augmented = true;
                  break;
                }
              } else if (this.label[w] === 0) {
                this.label[w] = 2;
                this.labelEnd[w] = p ^ 1;
              }
            } else if (this.label[this.inBlossom[w]] === 1) {
              const b = this.inBlossom[v];
              if (this.bestEdge[b] === -1 || kSlack < this.slack(this.bestEdge[b])) {
                this.bestEdge[b] = k;
              }
            } else if (
              this.label[w] === 0 &&
              (this.bestEdge[w] === -1 || kSlack < this.slack(this.bestEdge[w]))
            ) {
              this.bestEdge[w] = k;
            }
          }
        }
        if (augmented) break;
        let deltaType = -1;
        let delta = 0;
        let deltaEdge = 0;
        let deltaBlossom = 0;
        if (!this.maxCardinality) {
          deltaType = 1;
          delta = getMin(this.dualVar, 0, this.nVertex - 1);
        }
        for (let v = 0; v < this.nVertex; v++) {
          if (this.label[this.inBlossom[v]] === 0 && this.bestEdge[v] !== -1) {
            const d = this.slack(this.bestEdge[v]);
            if (deltaType === -1 || d < delta) {
              delta = d;
              deltaType = 2;
              deltaEdge = this.bestEdge[v];
            }
          }
        }
        for (let b = 0; b < 2 * this.nVertex; b++) {
          if (this.blossomParent[b] === -1 && this.label[b] === 1 && this.bestEdge[b] !== -1) {
            const kSlack = this.slack(this.bestEdge[b]);
            const d = kSlack / 2;
            if (deltaType === -1 || d < delta) {
              delta = d;
              deltaType = 3;
              deltaEdge = this.bestEdge[b];
            }
          }
        }
        for (let b = this.nVertex; b < this.nVertex * 2; b++) {
          if (
            this.blossomBase[b] >= 0 &&
            this.blossomParent[b] === -1 &&
            this.label[b] === 2 &&
            (deltaType === -1 || this.dualVar[b] < delta)
          ) {
            delta = this.dualVar[b];
            deltaType = 4;
            deltaBlossom = b;
          }
        }
        if (deltaType === -1) {
          deltaType = 1;
          delta = Math.max(0, getMin(this.dualVar, 0, this.nVertex - 1));
        }
        for (let v = 0; v < this.nVertex; v++) {
          const curLabel = this.label[this.inBlossom[v]];
          if (curLabel === 1) {
            this.dualVar[v] -= delta;
          } else if (curLabel === 2) {
            this.dualVar[v] += delta;
          }
        }
        for (let b = this.nVertex; b < this.nVertex * 2; b++) {
          if (this.blossomBase[b] >= 0 && this.blossomParent[b] === -1) {
            if (this.label[b] === 1) {
              this.dualVar[b] += delta;
            } else if (this.label[b] === 2) {
              this.dualVar[b] -= delta;
            }
          }
        }
        if (deltaType === 1) {
          break;
        }
        if (deltaType === 2) {
          this.allowEdge[deltaEdge] = true;
          let i = this.edges[deltaEdge][0];
          let j = this.edges[deltaEdge][1];
          if (this.label[this.inBlossom[i]] === 0) {
            i = i ^ j;
            j = j ^ i;
            i = i ^ j;
          }
          this.queue.push(i);
        } else if (deltaType === 3) {
          this.allowEdge[deltaEdge] = true;
          const i = this.edges[deltaEdge][0];
          this.queue.push(i);
        } else if (deltaType === 4) {
          this.expandBlossom(deltaBlossom, false);
        }
      }
      if (!augmented) break;
      for (let b = this.nVertex; b < this.nVertex * 2; b++) {
        if (
          this.blossomParent[b] === -1 &&
          this.blossomBase[b] >= 0 &&
          this.label[b] === 1 &&
          this.dualVar[b] === 0
        ) {
          this.expandBlossom(b, true);
        }
      }
    }
    for (let v = 0; v < this.nVertex; v++) {
      if (this.mate[v] >= 0) {
        this.mate[v] = this.endpoint[this.mate[v]];
      }
    }
    return this.mate;
  }

  private slack(k: number): number {
    const i = this.edges[k][0];
    const j = this.edges[k][1];
    const wt = this.edges[k][2];
    return this.dualVar[i] + this.dualVar[j] - 2 * wt;
  }

  private blossomLeaves(b: number): number[] {
    if (b < this.nVertex) {
      return [b];
    }
    const leaves: number[] = [];
    const childList = this.blossomChilds[b];
    for (let t = 0; t < childList.length; t++) {
      if (childList[t] < this.nVertex) {
        leaves.push(childList[t]);
      } else {
        const leafList = this.blossomLeaves(childList[t]);
        for (let v = 0; v < leafList.length; v++) {
          leaves.push(leafList[v]);
        }
      }
    }
    return leaves;
  }

  private assignLabel(w: number, t: number, p: number): void {
    const b = this.inBlossom[w];
    this.label[w] = this.label[b] = t;
    this.labelEnd[w] = this.labelEnd[b] = p;
    this.bestEdge[w] = this.bestEdge[b] = -1;
    if (t === 1) {
      this.queue.push(...this.blossomLeaves(b));
    } else if (t === 2) {
      const base = this.blossomBase[b];
      this.assignLabel(this.endpoint[this.mate[base]], 1, this.mate[base] ^ 1);
    }
  }

  private scanBlossom(v: number, w: number): number {
    let vv = v;
    let ww = w;
    const path: number[] = [];
    let base = -1;
    while (vv !== -1 || ww !== -1) {
      let b = this.inBlossom[vv];
      if (this.label[b] & 4) {
        base = this.blossomBase[b];
        break;
      }
      path.push(b);
      this.label[b] = 5;
      if (this.labelEnd[b] === -1) {
        vv = -1;
      } else {
        vv = this.endpoint[this.labelEnd[b]];
        b = this.inBlossom[vv];
        vv = this.endpoint[this.labelEnd[b]];
      }
      if (ww !== -1) {
        vv = vv ^ ww;
        ww = ww ^ vv;
        vv = vv ^ ww;
      }
    }
    for (let ii = 0; ii < path.length; ii++) {
      this.label[path[ii]] = 1;
    }
    return base;
  }

  private addBlossom(base: number, k: number): void {
    const v = this.edges[k][0];
    const w = this.edges[k][1];
    const bb = this.inBlossom[base];
    let bv = this.inBlossom[v];
    let bw = this.inBlossom[w];
    const b = this.unusedBlossoms.pop()!;
    this.blossomBase[b] = base;
    this.blossomParent[b] = -1;
    this.blossomParent[bb] = b;
    const path: number[] = [];
    const endPs: number[] = [];
    this.blossomChilds[b] = path;
    this.blossomEndPs[b] = endPs;
    while (bv !== bb) {
      this.blossomParent[bv] = b;
      path.push(bv);
      endPs.push(this.labelEnd[bv]);
      const nextV = this.endpoint[this.labelEnd[bv]];
      bv = this.inBlossom[nextV];
    }
    path.push(bb);
    path.reverse();
    endPs.reverse();
    endPs.push(2 * k);
    while (bw !== bb) {
      this.blossomParent[bw] = b;
      path.push(bw);
      endPs.push(this.labelEnd[bw] ^ 1);
      const nextW = this.endpoint[this.labelEnd[bw]];
      bw = this.inBlossom[nextW];
    }
    this.label[b] = 1;
    this.labelEnd[b] = this.labelEnd[bb];
    this.dualVar[b] = 0;
    const leaves = this.blossomLeaves(b);
    for (let ii = 0; ii < leaves.length; ii++) {
      const lv = leaves[ii];
      if (this.label[this.inBlossom[lv]] === 2) {
        this.queue.push(lv);
      }
      this.inBlossom[lv] = b;
    }
    const bestEdgeTo = filledArray(2 * this.nVertex, -1);
    for (let ii = 0; ii < path.length; ii++) {
      const bvi = path[ii];
      let nbLists: number[][];
      if (this.blossomBestEdges[bvi].length === 0) {
        nbLists = [];
        const bviLeaves = this.blossomLeaves(bvi);
        for (let x = 0; x < bviLeaves.length; x++) {
          const lv = bviLeaves[x];
          nbLists[x] = [];
          for (let y = 0; y < this.neighbend[lv].length; y++) {
            const p = this.neighbend[lv][y];
            nbLists[x].push(~~(p / 2));
          }
        }
      } else {
        nbLists = [this.blossomBestEdges[bvi]];
      }
      for (let x = 0; x < nbLists.length; x++) {
        const nbList = nbLists[x];
        for (let y = 0; y < nbList.length; y++) {
          const ek = nbList[y];
          let i = this.edges[ek][0];
          let j = this.edges[ek][1];
          if (this.inBlossom[j] === b) {
            i = i ^ j;
            j = j ^ i;
            i = i ^ j;
          }
          const bj = this.inBlossom[j];
          if (
            bj !== b &&
            this.label[bj] === 1 &&
            (bestEdgeTo[bj] === -1 || this.slack(ek) < this.slack(bestEdgeTo[bj]))
          ) {
            bestEdgeTo[bj] = ek;
          }
        }
      }
      this.blossomBestEdges[bvi] = [];
      this.bestEdge[bvi] = -1;
    }
    const be: number[] = [];
    for (let ii = 0; ii < bestEdgeTo.length; ii++) {
      if (bestEdgeTo[ii] !== -1) {
        be.push(bestEdgeTo[ii]);
      }
    }
    this.blossomBestEdges[b] = be;
    this.bestEdge[b] = -1;
    for (let ii = 0; ii < this.blossomBestEdges[b].length; ii++) {
      const ek = this.blossomBestEdges[b][ii];
      if (this.bestEdge[b] === -1 || this.slack(ek) < this.slack(this.bestEdge[b])) {
        this.bestEdge[b] = ek;
      }
    }
  }

  private expandBlossom(b: number, endStage: boolean): void {
    for (let ii = 0; ii < this.blossomChilds[b].length; ii++) {
      const s = this.blossomChilds[b][ii];
      this.blossomParent[s] = -1;
      if (s < this.nVertex) {
        this.inBlossom[s] = s;
      } else if (endStage && this.dualVar[s] === 0) {
        this.expandBlossom(s, endStage);
      } else {
        const leaves = this.blossomLeaves(s);
        for (let jj = 0; jj < leaves.length; jj++) {
          this.inBlossom[leaves[jj]] = s;
        }
      }
    }
    if (!endStage && this.label[b] === 2) {
      const entryChild = this.inBlossom[this.endpoint[this.labelEnd[b] ^ 1]];
      let j = this.blossomChilds[b].indexOf(entryChild);
      let jStep: number;
      let endpTrick: number;
      if (j & 1) {
        j -= this.blossomChilds[b].length;
        jStep = 1;
        endpTrick = 0;
      } else {
        jStep = -1;
        endpTrick = 1;
      }
      let p = this.labelEnd[b];
      while (j !== 0) {
        this.label[this.endpoint[p ^ 1]] = 0;
        this.label[this.endpoint[pIndex(this.blossomEndPs[b], j - endpTrick) ^ endpTrick ^ 1]] = 0;
        this.assignLabel(this.endpoint[p ^ 1], 2, p);
        this.allowEdge[~~(pIndex(this.blossomEndPs[b], j - endpTrick) / 2)] = true;
        j += jStep;
        p = pIndex(this.blossomEndPs[b], j - endpTrick) ^ endpTrick;
        this.allowEdge[~~(p / 2)] = true;
        j += jStep;
      }
      const bv = pIndex(this.blossomChilds[b], j);
      this.label[this.endpoint[p ^ 1]] = this.label[bv] = 2;
      this.labelEnd[this.endpoint[p ^ 1]] = this.labelEnd[bv] = p;
      this.bestEdge[bv] = -1;
      j += jStep;
      while (pIndex(this.blossomChilds[b], j) !== entryChild) {
        const bvi = pIndex(this.blossomChilds[b], j);
        if (this.label[bvi] === 1) {
          j += jStep;
          continue;
        }
        const leaves = this.blossomLeaves(bvi);
        let lv = 0;
        for (let ii = 0; ii < leaves.length; ii++) {
          lv = leaves[ii];
          if (this.label[lv] !== 0) break;
        }
        if (this.label[lv] !== 0) {
          this.label[lv] = 0;
          this.label[this.endpoint[this.mate[this.blossomBase[bvi]]]] = 0;
          this.assignLabel(lv, 2, this.labelEnd[lv]);
        }
        j += jStep;
      }
    }
    this.label[b] = this.labelEnd[b] = -1;
    this.blossomEndPs[b] = this.blossomChilds[b] = [];
    this.blossomBase[b] = -1;
    this.blossomBestEdges[b] = [];
    this.bestEdge[b] = -1;
    this.unusedBlossoms.push(b);
  }

  private augmentBlossom(b: number, v: number): void {
    let t = v;
    while (this.blossomParent[t] !== b) {
      t = this.blossomParent[t];
    }
    if (t >= this.nVertex) {
      this.augmentBlossom(t, v);
    }
    const i = this.blossomChilds[b].indexOf(t);
    let j = i;
    let jStep: number;
    let endpTrick: number;
    if (j & 1) {
      j -= this.blossomChilds[b].length;
      jStep = 1;
      endpTrick = 0;
    } else {
      jStep = -1;
      endpTrick = 1;
    }
    while (j !== 0) {
      j += jStep;
      t = pIndex(this.blossomChilds[b], j);
      const p = pIndex(this.blossomEndPs[b], j - endpTrick) ^ endpTrick;
      if (t >= this.nVertex) {
        this.augmentBlossom(t, this.endpoint[p]);
      }
      j += jStep;
      t = pIndex(this.blossomChilds[b], j);
      if (t >= this.nVertex) {
        this.augmentBlossom(t, this.endpoint[p ^ 1]);
      }
      this.mate[this.endpoint[p]] = p ^ 1;
      this.mate[this.endpoint[p ^ 1]] = p;
    }
    this.blossomChilds[b] = this.blossomChilds[b]
      .slice(i)
      .concat(this.blossomChilds[b].slice(0, i));
    this.blossomEndPs[b] = this.blossomEndPs[b].slice(i).concat(this.blossomEndPs[b].slice(0, i));
    this.blossomBase[b] = this.blossomBase[this.blossomChilds[b][0]];
  }

  private augmentMatching(k: number): void {
    const v = this.edges[k][0];
    const w = this.edges[k][1];
    for (let ii = 0; ii < 2; ii++) {
      let s: number;
      let p: number;
      if (ii === 0) {
        s = v;
        p = 2 * k + 1;
      } else {
        s = w;
        p = 2 * k;
      }
      while (true) {
        const bs = this.inBlossom[s];
        if (bs >= this.nVertex) {
          this.augmentBlossom(bs, s);
        }
        this.mate[s] = p;
        if (this.labelEnd[bs] === -1) break;
        const t = this.endpoint[this.labelEnd[bs]];
        const bt = this.inBlossom[t];
        s = this.endpoint[this.labelEnd[bt]];
        const j = this.endpoint[this.labelEnd[bt] ^ 1];
        if (bt >= this.nVertex) {
          this.augmentBlossom(bt, j);
        }
        this.mate[j] = this.labelEnd[bt];
        p = this.labelEnd[bt] ^ 1;
      }
    }
  }

  private init(): void {
    this.nVertexInit();
    this.maxWeightInit();
    this.endpointInit();
    this.neighbendInit();
    this.mate = filledArray(this.nVertex, -1);
    this.label = filledArray(2 * this.nVertex, 0);
    this.labelEnd = filledArray(2 * this.nVertex, -1);
    this.inBlossomInit();
    this.blossomParent = filledArray(2 * this.nVertex, -1);
    this.blossomChilds = initArrArr(2 * this.nVertex);
    this.blossomBaseInit();
    this.blossomEndPs = initArrArr(2 * this.nVertex);
    this.bestEdge = filledArray(2 * this.nVertex, -1);
    this.blossomBestEdges = initArrArr(2 * this.nVertex);
    this.unusedBlossomsInit();
    this.dualVarInit();
    this.allowEdge = filledArray(this.nEdge, false);
    this.queue = [];
  }

  private blossomBaseInit(): void {
    const base: number[] = [];
    for (let i = 0; i < this.nVertex; i++) {
      base[i] = i;
    }
    this.blossomBase = base.concat(filledArray(this.nVertex, -1));
  }

  private dualVarInit(): void {
    this.dualVar = filledArray(this.nVertex, this.maxWeight).concat(filledArray(this.nVertex, 0));
  }

  private unusedBlossomsInit(): void {
    const unusedBlossoms: number[] = [];
    for (let i = this.nVertex; i < 2 * this.nVertex; i++) {
      unusedBlossoms.push(i);
    }
    this.unusedBlossoms = unusedBlossoms;
  }

  private inBlossomInit(): void {
    const inBlossom: number[] = [];
    for (let i = 0; i < this.nVertex; i++) {
      inBlossom[i] = i;
    }
    this.inBlossom = inBlossom;
  }

  private neighbendInit(): void {
    const neighbend = initArrArr(this.nVertex);
    for (let k = 0; k < this.nEdge; k++) {
      const i = this.edges[k][0];
      const j = this.edges[k][1];
      neighbend[i].push(2 * k + 1);
      neighbend[j].push(2 * k);
    }
    this.neighbend = neighbend;
  }

  private endpointInit(): void {
    const endpoint: number[] = [];
    for (let p = 0; p < 2 * this.nEdge; p++) {
      endpoint[p] = this.edges[~~(p / 2)][p % 2];
    }
    this.endpoint = endpoint;
  }

  private nVertexInit(): void {
    let nVertex = 0;
    for (let k = 0; k < this.nEdge; k++) {
      const i = this.edges[k][0];
      const j = this.edges[k][1];
      if (i >= nVertex) nVertex = i + 1;
      if (j >= nVertex) nVertex = j + 1;
    }
    this.nVertex = nVertex;
  }

  private maxWeightInit(): void {
    let maxWeight = 0;
    for (let k = 0; k < this.nEdge; k++) {
      const weight = this.edges[k][2];
      if (weight > maxWeight) {
        maxWeight = weight;
      }
    }
    this.maxWeight = maxWeight;
  }
}

const blossom = (edges: [number, number, number][], maxCardinality = false): number[] => {
  if (edges.length === 0) {
    return [];
  }
  const edmonds = new Edmonds(edges, maxCardinality);
  return edmonds.maxWeightMatching();
};

export default blossom;
