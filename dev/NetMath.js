"use strict"

class NetMath {
    
    // Activation functions
    static sigmoid (value, prime) {
        const val = 1/(1+Math.exp(-value))
        return prime ? val*(1-val)
                     : val
    }

    static tanh (value, prime) {
        const exp = Math.exp(2*value)
        return prime ? 4/Math.pow(Math.exp(value)+Math.exp(-value), 2) || 1e-18
                     : (exp-1)/(exp+1) || 1e-18
    }

    static relu (value, prime) {
        return prime ? value > 0 ? 1 : 0
                     : Math.max(value, 0)
    }

    static lrelu (value, prime) {
        return prime ? value > 0 ? 1 : this.lreluSlope
                     : Math.max(this.lreluSlope*Math.abs(value), value)
    }

    static rrelu (value, prime, neuron) {
        return prime ? value > 0 ? 1 : neuron.rreluSlope
                     : Math.max(neuron.rreluSlope, value)   
    }

    static lecuntanh (value, prime) {
        return prime ? 1.15333 * Math.pow(NetMath.sech((2/3) * value), 2)
                     : 1.7159 * NetMath.tanh((2/3) * value)
    }

    static elu (value, prime, neuron) {
        return prime ? value >=0 ? 1 : NetMath.elu(value, false, neuron) + neuron.eluAlpha
                     : value >=0 ? value : neuron.eluAlpha * (Math.exp(value) - 1)
    }
    
    // Cost functions
    static crossEntropy (target, output) {
        return output.map((value, vi) => target[vi] * Math.log(value+1e-15) + ((1-target[vi]) * Math.log((1+1e-15)-value)))
                     .reduce((p,c) => p-c, 0)
    }

    static meanSquaredError (calculated, desired) {
        return calculated.map((output, index) => Math.pow(output - desired[index], 2))
                         .reduce((prev, curr) => prev+curr, 0) / calculated.length
    }

    // Weight updating functions
    static noAdaptiveLR (value, deltaValue) {
        return value + this.learningRate * deltaValue
    }

    static gain (value, deltaValue, neuron, weightI) {

        const newVal = value + this.learningRate * deltaValue * (weightI==null ? neuron.biasGain : neuron.weightGains[weightI])

        if(newVal<=0 && value>0 || newVal>=0 && value<0){
            if(weightI!=null)
                 neuron.weightGains[weightI] = Math.max(neuron.weightGains[weightI]*0.95, 0.5)
            else neuron.biasGain = Math.max(neuron.biasGain*0.95, 0.5)
        }else {
            if(weightI!=null)
                 neuron.weightGains[weightI] = Math.min(neuron.weightGains[weightI]+0.05, 5)
            else neuron.biasGain = Math.min(neuron.biasGain+0.05, 5)
        }

        return newVal
    }

    static adagrad (value, deltaValue, neuron, weightI) {

        if(weightI!=null)
             neuron.weightsCache[weightI] += Math.pow(deltaValue, 2)
        else neuron.biasCache += Math.pow(deltaValue, 2)

        return value + this.learningRate * deltaValue / (1e-6 + Math.sqrt(weightI!=null ? neuron.weightsCache[weightI]
                                                                                        : neuron.biasCache))
    }

    static RMSProp (value, deltaValue, neuron, weightI) {

        if(weightI!=null)
             neuron.weightsCache[weightI] = this.rmsDecay * neuron.weightsCache[weightI] + (1 - this.rmsDecay) * Math.pow(deltaValue, 2)
        else neuron.biasCache = this.rmsDecay * neuron.biasCache + (1 - this.rmsDecay) * Math.pow(deltaValue, 2)

        return value + this.learningRate * deltaValue / (1e-6 + Math.sqrt(weightI!=null ? neuron.weightsCache[weightI]
                                                                                        : neuron.biasCache))
    }

    static adam (value, deltaValue, neuron) {

        neuron.m = 0.9*neuron.m + (1-0.9) * deltaValue
        const mt = neuron.m / (1-Math.pow(0.9, this.iterations + 1))

        neuron.v = 0.999*neuron.v + (1-0.999)*(Math.pow(deltaValue, 2))
        const vt = neuron.v / (1-Math.pow(0.999, this.iterations + 1))

        return value + this.learningRate * mt / (Math.sqrt(vt) + 1e-8)
    }

    static adadelta (value, deltaValue, neuron, weightI) {

        if(weightI!=null) {
            neuron.weightsCache[weightI] = this.rho * neuron.weightsCache[weightI] + (1-this.rho) * Math.pow(deltaValue, 2)
            const newVal = value + Math.sqrt((neuron.adadeltaCache[weightI] + 1e-6)/(neuron.weightsCache[weightI] + 1e-6)) * deltaValue
            neuron.adadeltaCache[weightI] = this.rho * neuron.adadeltaCache[weightI] + (1-this.rho) * Math.pow(deltaValue, 2)
            return newVal

        }else {
            neuron.biasCache = this.rho * neuron.biasCache + (1-this.rho) * Math.pow(deltaValue, 2)
            const newVal = value + Math.sqrt((neuron.adadeltaBiasCache + 1e-6)/(neuron.biasCache + 1e-6)) * deltaValue
            neuron.adadeltaBiasCache = this.rho * neuron.adadeltaBiasCache + (1-this.rho) * Math.pow(deltaValue, 2)
            return newVal
        }
    }

    // Weights init
    static uniform (size, {limit}) {
        return [...new Array(size)].map(v => Math.random()*2*limit-limit)
    }

    // Other
    static softmax (values) {
        const total = values.reduce((prev, curr) => prev+curr, 0)
        return values.map(value => value/total)
    }

    static sech (value) {
        return (2*Math.exp(-value))/(1+Math.exp(-2*value))
    }

    static maxNorm () {

        if(this.maxNormTotal > this.maxNorm) {

            const multiplier = this.maxNorm / (1e-18 + this.maxNormTotal)

            this.layers.forEach((layer, li) => {
                li && layer.neurons.forEach(neuron => {
                    neuron.weights.forEach((w, wi) => {
                        neuron.weights[wi] *= multiplier
                    })
                })
            })
        }

        this.maxNormTotal = 0
    }
}

typeof window=="undefined" && (global.NetMath = NetMath)