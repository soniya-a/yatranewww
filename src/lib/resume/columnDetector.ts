export interface TextItemWithPos {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Robust Column-Aware Text Reordering for PDF Pages
 * 
 * Prevents interleaving of multi-column resumes where naive top-to-bottom sorting
 * combines left-sidebar content with right-body content on the same line.
 */
export function reorderPageItemsColumnAware(items: TextItemWithPos[]): TextItemWithPos[] {
  if (items.length <= 1) return items;

  // Filter out pure whitespace items
  const validItems = items.filter(it => it.str && it.str.trim().length > 0);
  if (validItems.length <= 1) return items;

  const minX = Math.min(...validItems.map(i => i.x));
  const maxX = Math.max(...validItems.map(i => i.x + i.width));
  const minY = Math.min(...validItems.map(i => i.y));
  const maxY = Math.max(...validItems.map(i => i.y));

  const pageWidth = maxX - minX;
  if (pageWidth < 100) {
    // Too narrow to have multiple columns
    return sortByTopDown(validItems);
  }

  // Detect if there is a header section spanning across the top (e.g. name, contact banner)
  // Header threshold: items in the top 15% of vertical space that are centered or wide
  const headerCutoffY = maxY - (maxY - minY) * 0.15;
  const headerItems: TextItemWithPos[] = [];
  const bodyItems: TextItemWithPos[] = [];

  for (const item of validItems) {
    // If item is near top and spans past 60% of page width, or top items in header zone
    if (item.y > headerCutoffY && item.width > pageWidth * 0.4) {
      headerItems.push(item);
    } else {
      bodyItems.push(item);
    }
  }

  if (bodyItems.length < 4) {
    return sortByTopDown(validItems);
  }

  // Check for 2-column gutter in bodyItems
  // Sample candidate split lines between 25% and 55% of page width
  const step = 15;
  let bestSplitX: number | null = null;
  let minCrossingItems = Infinity;

  const startX = minX + pageWidth * 0.25;
  const endX = minX + pageWidth * 0.55;

  for (let splitCandidate = startX; splitCandidate <= endX; splitCandidate += step) {
    let crossingCount = 0;
    let leftCount = 0;
    let rightCount = 0;

    for (const it of bodyItems) {
      const itLeft = it.x;
      const itRight = it.x + it.width;

      if (itLeft < splitCandidate && itRight > splitCandidate) {
        // String crosses the split line
        crossingCount++;
      } else if (itRight <= splitCandidate) {
        leftCount++;
      } else if (itLeft >= splitCandidate) {
        rightCount++;
      }
    }

    // Both columns must have substantial text items (at least 15% each)
    const total = bodyItems.length;
    const isBalanced = leftCount >= total * 0.15 && rightCount >= total * 0.25;

    // We want minimal crossing items and high balance
    if (isBalanced && crossingCount < minCrossingItems) {
      minCrossingItems = crossingCount;
      bestSplitX = splitCandidate;
    }
  }

  // If a clean gutter was found (very few crossing items compared to column items)
  if (bestSplitX !== null && minCrossingItems <= Math.max(3, bodyItems.length * 0.08)) {
    const leftCol: TextItemWithPos[] = [];
    const rightCol: TextItemWithPos[] = [];
    const wideBodyItems: TextItemWithPos[] = [];

    for (const it of bodyItems) {
      const itLeft = it.x;
      const itRight = it.x + it.width;

      if (itLeft < bestSplitX && itRight > bestSplitX) {
        wideBodyItems.push(it);
      } else if (itRight <= bestSplitX) {
        leftCol.push(it);
      } else {
        rightCol.push(it);
      }
    }

    const sortedHeader = sortByTopDown(headerItems);
    const sortedLeft = sortByTopDown(leftCol);
    const sortedRight = sortByTopDown(rightCol);
    const sortedWide = sortByTopDown(wideBodyItems);

    // Sequence: Header -> Left Column (often sidebar/skills) -> Right Column (experience/education) -> Wide footer
    return [...sortedHeader, ...sortedLeft, ...sortedRight, ...sortedWide];
  }

  // Fallback to standard top-down sort
  return sortByTopDown(validItems);
}

function sortByTopDown(items: TextItemWithPos[]): TextItemWithPos[] {
  return [...items].sort((a, b) => {
    const yDiff = b.y - a.y; // Higher Y first (top of PDF page)
    if (Math.abs(yDiff) > 3) {
      return yDiff;
    }
    return a.x - b.x; // Left to right
  });
}
