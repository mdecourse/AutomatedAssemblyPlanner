﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TVGL;
using StarMathLib;

namespace Assembly_Planner
{
    internal class AutoThreadedFastenerDetection
    {
        internal static void Run(
            Dictionary<TessellatedSolid, List<PrimitiveSurface>> solidPrimitive,
            Dictionary<TessellatedSolid, List<TessellatedSolid>> multipleRefs)
        {
            // This is mostly similar to the auto fastener detection with no thread, but instead of learning
            // from the area of the cylinder and for example flat, we will learn from the number of faces.
            // why? because if we have thread, we will have too many triangles. And this can be useful.
            // I can also detect helix and use this to detect the threaded fasteners

            // Important: if the fasteners are threaded using solidworks Fastener toolbox, it will not
            //            have helix. The threads will be small cones with the same axis and equal area.

            var firstFilter = FastenerDetector.SmallObjectsDetector(multipleRefs); //multipleRefs.Keys.ToList();
            var equalPrimitivesForEverySolid = FastenerDetector.EqualFlatPrimitiveAreaFinder(firstFilter, solidPrimitive);
            var groupedPotentialFasteners = FastenerDetector.GroupingSmallParts(firstFilter);
            List<int> learnerVotes;
            var learnerWeights = FastenerLearner.ReadingLearnerWeightsAndVotesFromCsv(out learnerVotes);
            foreach (var solid in firstFilter)
            {
                // if a fastener is detected using polynomial trend approach, it is definitely a fastener but not a nut.
                // if it is detected using any other approach, but not polynomial trend, it is a possible nut.
                double toolSize;
                var commonHead = CommonHeadCheck(solid, solidPrimitive[solid], equalPrimitivesForEverySolid[solid],
                    out toolSize);
                if (commonHead != 0)
                {
                    if (FastenerPolynomialTrend.PolynomialTrendDetector(solid))
                    {
                        var lastAddedFastener = FastenerDetector.Fasteners[FastenerDetector.Fasteners.Count - 1];
                        lastAddedFastener.FastenerType = FastenerTypeEnum.Bolt;
                        lastAddedFastener.ToolSize = toolSize;
                        if (commonHead == 1)
                        {
                            lastAddedFastener.Tool = Tool.HexWrench;
                            continue;
                        }
                        if (commonHead == 2)
                        {
                            lastAddedFastener.Tool = Tool.Allen;
                            continue;
                        }
                        if (commonHead == 3)
                        {
                            lastAddedFastener.Tool = Tool.PhillipsBlade;
                            continue;
                        }
                        if (commonHead == 4)
                        {
                            lastAddedFastener.Tool = Tool.FlatBlade;
                            continue;
                        }
                        if (commonHead == 5)
                        {
                            lastAddedFastener.Tool = Tool.PhillipsBlade;
                            continue;
                        }
                    }
                    else // can be a nut
                    {
                        if (commonHead == 1)
                        {
                            FastenerDetector.Nuts.Add(new Nut
                            {
                                Solid = solid,
                                NutType = NutType.Hex,
                                Tool = Tool.HexWrench,
                                ToolSize = toolSize,
                                Certainty = 0.9
                            });
                            continue;
                        }
                    }
                }
                if (FastenerLearner.FastenerPerceptronLearner(solidPrimitive[solid], solid, learnerWeights, learnerVotes))
                {
                    if (FastenerPolynomialTrend.PolynomialTrendDetector(solid))
                    {
                        var lastAddedFastener = FastenerDetector.Fasteners[FastenerDetector.Fasteners.Count - 1];
                        lastAddedFastener.FastenerType = FastenerTypeEnum.Bolt;
                    }
                    else
                    {
                        // can be a nut
                        // use bounding cylinder to detect nuts.
                        // a new code again? :(

                    }
                }


                //if (ThreadDetector(solid, solidPrimitive[solid]))
                //{
                //      CommonHeadFatener();
                //      continue;
                //}
            }
        }

        private static void CommonHeadFastenerAndTools(Fastener lastAddedFastener,
            Dictionary<PrimitiveSurface, List<PrimitiveSurface>> equalPrimitives)
        {
            throw new NotImplementedException();
        }

        private static bool ThreadDetector(TessellatedSolid solid, List<PrimitiveSurface> primitiveSurfaces)
        {
            // Consider these two cases:
            //      1. Threads are helix
            //      2. Threads are seperate cones
            if (ThreadsAreSeperateCones(solid, primitiveSurfaces))
                return true;
            return SolidHasHelix(solid);

        }

        private static bool ThreadsAreSeperateCones(TessellatedSolid solid, List<PrimitiveSurface> primitiveSurfaces)
        {
            var cones = primitiveSurfaces.Where(p => p is Cone).Cast<Cone>().ToList();
            foreach (var cone in cones.Where(c => c.Faces.Count > 30))
            {
                var threads =
                    cones.Where(
                        c =>
                            (Math.Abs(c.Axis.dotProduct(cone.Axis) - 1) < 0.001 ||
                             Math.Abs(c.Axis.dotProduct(cone.Axis) + 1) < 0.001) &&
                            (Math.Abs(c.Faces.Count - cone.Faces.Count) < 3) &&
                            (Math.Abs(c.Area - cone.Area) < 0.001) &&
                            (Math.Abs(c.Aperture - cone.Aperture) < 0.001)).ToList();
                if (threads.Count < 10) continue;
                if (ConeThreadIsInternal(threads))
                    FastenerDetector.Nuts.Add(new Nut {Solid = solid});
                FastenerDetector.Fasteners.Add(new Fastener
                {
                    Solid = solid,
                    RemovalDirection =
                        FastenerDetector.RemovalDirectionFinderUsingObb(solid,
                            BoundingGeometry.OrientedBoundingBoxDic[solid])
                });
                return true;
            }
            return false;
        }

        private static bool SolidHasHelix(TessellatedSolid solid)
        {
            // Idea: find an edge which has an internal angle equal to one of the following cases.
            // This only works if at least one of outer or inner threads have a sharo edge.
            // take the connected edges (from both sides) which have the same feature.
            // If it rotates couple of times, it is a helix.
            // It seems to be expensive. Let's see how it goes.
            // Standard thread angles:
            //       60     55     29     45     30    80 
            foreach (var edge in solid.Edges.Where(e => Math.Abs(e.InternalAngle - 2.08566845) < 0.04))
                // 2.0943951 is equal to 120 degree
            {
                // To every side of the edge if there is one edge with the IA of 120, this edge is unique and we dcannot find the second one. 
                var visited = new HashSet<Edge> {edge};
                var stack = new Stack<Edge>();
                var possibleHelixEdges = FindHelixEdgesConnectedToAnEdge(solid.Edges, edge, visited);
                // It can have 0, 1 or 2 edges
                if (possibleHelixEdges == null) continue;
                foreach (var e in possibleHelixEdges)
                    stack.Push(e);

                while (stack.Any() && visited.Count < 1000)
                {
                    var e = stack.Pop();
                    visited.Add(e);
                    var cand = FindHelixEdgesConnectedToAnEdge(solid.Edges, e, visited);
                    // if yes, it will only have one edge.
                    if (cand == null) continue;
                    stack.Push(cand[0]);
                }
                if (visited.Count < 1000) // Is it very big?
                    continue;
                // if the thread is internal, classify it as nut, else fastener
                if (HelixThreadIsInternal(visited))
                    FastenerDetector.Nuts.Add(new Nut {Solid = solid});
                FastenerDetector.Fasteners.Add(new Fastener
                {
                    Solid = solid,
                    RemovalDirection =
                        FastenerDetector.RemovalDirectionFinderUsingObb(solid,
                            BoundingGeometry.OrientedBoundingBoxDic[solid])
                });
                return true;
            }
            return false;
        }

        private static bool ConeThreadIsInternal(List<Cone> threads)
        {
            // If it is seperated cones, it's easy: negative cones make internal thread
            // To make it robust, if 70 percent of the cones are negative, it is internal
            var neg = threads.Count(cone => !cone.IsPositive);
            if (neg >= 0.7*threads.Count) return true;
            return false;
        }

        private static bool HelixThreadIsInternal(HashSet<Edge> helixEdges)
        {
            return false;
        }

        private static Edge[] FindHelixEdgesConnectedToAnEdge(Edge[] edges, Edge edge, HashSet<Edge> visited)
        {

            var m = new List<Edge>();
            var e1 =
                edges.Where(
                    e =>
                        (edge.From == e.From || edge.From == e.To) &&
                        Math.Abs(e.InternalAngle - 2.08566845) < 0.04 && !visited.Contains(e)).ToList();
            var e2 =
                edges.Where(
                    e =>
                        (edge.To == e.From || edge.To == e.To) &&
                        Math.Abs(e.InternalAngle - 2.08566845) < 0.04 && !visited.Contains(e)).ToList();
            if (!e1.Any() && !e2.Any()) return null;
            if (e1.Any()) m.Add(e1[0]);
            if (e2.Any()) m.Add(e2[0]);
            return m.ToArray();
        }

        private static int CommonHeadCheck(TessellatedSolid solid, List<PrimitiveSurface> solidPrim,
            Dictionary<PrimitiveSurface, List<PrimitiveSurface>> equalPrimitives, out double toolSize)
        {
            // 0: false (doesnt have any common head shape)
            // 1: HexBolt or Nut
            // 2: Allen
            // 3: Phillips
            // 4: Slot
            // 5: Phillips and Slot combo

            toolSize = 0.0;
            // check for hex bolt, nut and allen -------------------------------------------------------------
            var sixFlat = FastenerDetector.EqualPrimitivesFinder(equalPrimitives, 6);
            var eightFlat = FastenerDetector.EqualPrimitivesFinder(equalPrimitives, 8);
            var twoFlat = FastenerDetector.EqualPrimitivesFinder(equalPrimitives, 2);
            var fourFlat = FastenerDetector.EqualPrimitivesFinder(equalPrimitives, 4);
            if (!sixFlat.Any()) return 0;
            foreach (var candidateHex in sixFlat)
            {
                var candidateHexVal = equalPrimitives[candidateHex];
                var cos = new List<double>();
                var firstPrimNormal = ((Flat) candidateHexVal[0]).Normal;
                for (var i = 1; i < candidateHexVal.Count; i++)
                    cos.Add(firstPrimNormal.dotProduct(((Flat) candidateHexVal[i]).Normal));
                // if it is a hex or allen bolt, the cos list must have two 1/2, two -1/2 and one -1
                if (cos.Count(c => Math.Abs(0.5 - c) < 0.0001) != 2 ||
                    cos.Count(c => Math.Abs(-0.5 - c) < 0.0001) != 2 ||
                    cos.Count(c => Math.Abs(-1 - c) < 0.0001) != 1) continue;
                toolSize = AutoNonthreadedFastenerDetection.ToolSizeFinder(candidateHexVal);
                if (AutoNonthreadedFastenerDetection.IsItAllen(candidateHexVal))
                    return 2;
                return 1;
            }
            foreach (var candidateHex in eightFlat)
            {
                var candidateHexVal = equalPrimitives[candidateHex];
                var cos = new List<double>();
                var firstPrimNormal = ((Flat) candidateHexVal[0]).Normal;
                for (var i = 1; i < candidateHexVal.Count; i++)
                    cos.Add(firstPrimNormal.dotProduct(((Flat) candidateHexVal[i]).Normal));
                // if it is philips head, the cos list must have four 0, two -1 and one 1
                if (cos.Count(c => Math.Abs(0.0 - c) < 0.0001) != 4 ||
                    cos.Count(c => Math.Abs(-1 - c) < 0.0001) != 2 ||
                    cos.Count(c => Math.Abs(1 - c) < 0.0001) != 1) continue;
                return 3;
            }
            foreach (var candidateHex in twoFlat)
            {
                var candidateHexVal = equalPrimitives[candidateHex];
                var cos = ((Flat) candidateHexVal[0]).Normal.dotProduct(((Flat) candidateHexVal[1]).Normal);
                if (!(Math.Abs(-1 - cos) < 0.0001)) continue;
                // I will add couple of conditions here:
                //    1. If the number of solid vertices in front of each flat is equal to another
                //    2. If the summation of the vertices in 1 is greater than the total # of verts
                //    3. and I also need to add some constraints for the for eample the area of the cylinder
                var leftVerts = AutoNonthreadedFastenerDetection.VertsInfrontOfFlat(solid, (Flat) candidateHexVal[0]);
                var rightVerts = AutoNonthreadedFastenerDetection.VertsInfrontOfFlat(solid, (Flat)candidateHexVal[1]);
                if (Math.Abs(leftVerts - rightVerts) > 2 || leftVerts + rightVerts <= solid.Vertices.Length)
                    continue;
                return 4;
            }

            var eachSlot = 0;
            var flats = new List<PrimitiveSurface>();
            foreach (var candidateHex in fourFlat)
            {
                var candidateHexVal = equalPrimitives[candidateHex];
                var cos = new List<double>();
                var firstPrimNormal = ((Flat)candidateHexVal[0]).Normal;
                for (var i = 1; i < candidateHexVal.Count; i++)
                    cos.Add(firstPrimNormal.dotProduct(((Flat)candidateHexVal[i]).Normal));
                // if it is a slot and phillips combo the cos list must have two -1 and one 1
                // and this needs to appear 2 times.
                if (cos.Count(c => Math.Abs(-1 - c) < 0.0001) != 2 ||
                    cos.Count(c => Math.Abs(1 - c) < 0.0001) != 1) continue;
                flats.AddRange(candidateHexVal);
                eachSlot++;
            }
            if (eachSlot == 2) return 5;
            return 0;
        }
    }
}
