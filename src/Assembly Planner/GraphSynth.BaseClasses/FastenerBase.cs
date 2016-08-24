﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml.Serialization;
using AssemblyEvaluation;
using TVGL;

namespace Assembly_Planner
{
    public class FastenerBase : InstallAction
    {

        /// <summary>
        /// The tesselated solid
        /// </summary>
        [XmlIgnore]
        public TessellatedSolid Solid;
        /// <summary>
        /// The removal direction
        /// </summary>
        public int RemovalDirection;
        /// <summary>
        /// The certainity of this classification
        /// </summary>
        public double Certainty;
        /// <summary>
        /// The tool if identified
        /// </summary>
        public Tool Tool;
        /// <summary>
        /// The size of the tool if identified
        /// </summary>
        public double ToolSize;
        /// <summary>
        /// The diameter
        /// </summary>
        public double Diameter;

    }
}