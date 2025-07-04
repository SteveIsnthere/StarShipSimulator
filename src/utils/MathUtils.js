moduleLoader.define('mathUtils', [], () => {
    
    class MathUtils {
        static getRad(degrees) {
            return degrees * Math.PI / 180;
        }

        static getDeg(radians) {
            return radians * 180 / Math.PI;
        }

        static clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        }

        static lerp(a, b, t) {
            return a + (b - a) * t;
        }

        static map(value, inMin, inMax, outMin, outMax) {
            return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
        }

        static normalizeAngle(angle) {
            while (angle > Math.PI) angle -= 2 * Math.PI;
            while (angle < -Math.PI) angle += 2 * Math.PI;
            return angle;
        }

        static angleDifference(a, b) {
            return this.normalizeAngle(a - b);
        }

        static distance2D(x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            return Math.sqrt(dx * dx + dy * dy);
        }

        static vector2DMagnitude(x, y) {
            return Math.sqrt(x * x + y * y);
        }

        static vector2DNormalize(x, y) {
            const magnitude = this.vector2DMagnitude(x, y);
            if (magnitude === 0) return { x: 0, y: 0 };
            return { x: x / magnitude, y: y / magnitude };
        }

        static vector2DDot(x1, y1, x2, y2) {
            return x1 * x2 + y1 * y2;
        }

        static vector2DAngle(x, y) {
            return Math.atan2(y, x);
        }

        static roundToDecimalPlaces(value, places) {
            const multiplier = Math.pow(10, places);
            return Math.round(value * multiplier) / multiplier;
        }

        static formatNumber(value, decimals = 2) {
            if (Math.abs(value) >= 1000000) {
                return (value / 1000000).toFixed(decimals) + 'M';
            } else if (Math.abs(value) >= 1000) {
                return (value / 1000).toFixed(decimals) + 'k';
            } else {
                return value.toFixed(decimals);
            }
        }

        static formatSpeed(speedMS) {
            return this.formatNumber(speedMS, 1) + ' m/s';
        }

        static formatAltitude(altitudeM) {
            if (altitudeM >= 1000) {
                return this.formatNumber(altitudeM / 1000, 2) + ' km';
            } else {
                return this.formatNumber(altitudeM, 0) + ' m';
            }
        }

        static formatMass(massKg) {
            if (massKg >= 1000) {
                return this.formatNumber(massKg / 1000, 1) + ' t';
            } else {
                return this.formatNumber(massKg, 1) + ' kg';
            }
        }

        static formatTime(seconds) {
            if (seconds >= 3600) {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = Math.floor(seconds % 60);
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            } else if (seconds >= 60) {
                const minutes = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${minutes}:${secs.toString().padStart(2, '0')}`;
            } else {
                return seconds.toFixed(1) + 's';
            }
        }

        static smoothstep(edge0, edge1, x) {
            const t = this.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
            return t * t * (3.0 - 2.0 * t);
        }

        static easeInOut(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }

        static calculateTrajectory(x0, y0, vx0, vy0, gravity, timeStep, maxTime) {
            const points = [];
            let t = 0;
            
            while (t <= maxTime) {
                const x = x0 + vx0 * t;
                const y = y0 + vy0 * t - 0.5 * gravity * t * t;
                
                points.push({ x, y, t });
                
                if (y <= 0 && t > 0) break;
                
                t += timeStep;
            }
            
            return points;
        }

        static predictImpactTime(altitude, speedY, gravity) {
            if (speedY >= 0) return Infinity;
            
            const discriminant = speedY * speedY + 2 * gravity * altitude;
            if (discriminant < 0) return Infinity;
            
            return (-speedY + Math.sqrt(discriminant)) / gravity;
        }

        static calculateCircularOrbitVelocity(planetMass, radius, gravitationalConstant = 6.674e-11) {
            return Math.sqrt(gravitationalConstant * planetMass / radius);
        }

        static calculateEscapeVelocity(planetMass, radius, gravitationalConstant = 6.674e-11) {
            return Math.sqrt(2 * gravitationalConstant * planetMass / radius);
        }

        static atmosphericDensity(altitude, seaLevelDensity = 1.225, scaleHeight = 8400) {
            return seaLevelDensity * Math.exp(-altitude / scaleHeight);
        }

        static dragAcceleration(velocity, dragCoefficient, area, density, mass) {
            const dragForce = 0.5 * density * velocity * velocity * dragCoefficient * area;
            return dragForce / mass;
        }
    }

    return MathUtils;
});